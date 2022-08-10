import jsdom from "jsdom";

export type WordQueryResponse = WordNotFoundResponse | MultipleResultsResponse;

export async function classifyWordQueryResponse(
    domObject: jsdom.JSDOM,
    searchPhrase: string
): Promise<WordQueryResponse> {
    const content = domObject.window.document.querySelector("#content");
    if (String(content?.children[1]?.className).length == 0) {
        // Standard result
        console.log("Standard result");
    } else if (content?.children[1]?.className.includes("hledani")) {
        if (content?.children[2]?.innerHTML.includes("nebyl nalezen.")) {
            // Word not found
            const b = content.getElementsByTagName("b")[0]?.innerHTML; // Get the "word not  found" text
            if (b == null) throw new Error("Error in parsing response"); // If the text is not found, throw an error
            const word = termInsideQuotes(b); // Get the word from the text
            if (word == null) throw new Error("Error in parsing response"); // If the word is not found, throw an error
            return new WordNotFoundResponse(word);
        } else if (String(content?.children[2]?.className).length == 0) {
            // Multiple results type 1 (ex. bez)
            const body = content?.children[2]; // selects the 3rd child - div without id
            const spans = body?.getElementsByTagName("span"); // different options are in spans, so we select all of them
            if (spans == null) throw new Error("Error in parsing response"); // if there are no spans, there are no results
            const results: { id: string; explanation: string }[] = []; 
            for (let i = 0; i < spans?.length; i++) { 
                const span = spans[i]; 
                if (!span) continue; // if there is no span, continue
                const a = span?.getElementsByTagName("a")[0]; // select the first a tag, because there is only one and it contains the url with the id
                const url = a?.getAttribute("href"); // get the url from the a tag
                if (url == null) continue; // if there is no url, continue
                const id = new URL(url).searchParams.get("id"); // get the id url param from the url
                const explanation = span.innerHTML.split("</a>")[1]?.split("<br>")[0]?.replace(", ", ""); // get the text after the a tag and before the br tag
                if (explanation == null || id == null) throw new Error("Error in parsing response"); // if there is no explanation or id, continue
                results.push({ id, explanation });
            }
            return new MultipleResultsResponse(searchPhrase, results);
        } else if (content?.children[2]?.className.includes("screen")) {
            // Multiple results type 2 (ex. je)
            const trs = content.querySelector("#dalsiz")?.children[0]?.children[0]?.children; // selects the trs from the table
            if (trs == null) throw new Error("Error in parsing response"); // if there are no trs, there are no results
            const results: { id: string; explanation: string }[] = [];
            for (let i = 0; i < trs.length; i++) {
                const tr = trs[i]; 
                if (!tr) continue; // if there is no tr, continue
                const url = tr
                    ?.getElementsByTagName("td")[0]
                    ?.children[0]?.getElementsByTagName("a")[0]
                    ?.getAttribute("href"); // get the url from the a tag hidden under another tag inside the first td
                if (url == null) continue; // if there is no url, continue
                const id = new URL(url).searchParams.get("id"); // get the id url param from the url
                if (id == null) throw new Error("Error in parsing response"); // if there is no id, continue
                const explanationElement = tr?.getElementsByTagName("td")[1]; // select the second td
                const descriptionInnerHTML = explanationElement?.innerHTML; // get the inner html of the second td
                if (descriptionInnerHTML == null) continue; // if there is no inner html, continue
                const description = removeHTMLTags(descriptionInnerHTML); // remove the html tags from the inner html
                results.push({ id, explanation: description });
            }
            return new MultipleResultsResponse(searchPhrase, results);
        } else throw new Error("Unknown result 1");
    } else throw new Error("Unknown response 2");
    throw new Error("Unknown response 3");
}

export abstract class GenericWordQueryResponse {
    public readonly name: string;
    public readonly searchPhrase: string;
    constructor(name: string, searchPhrase: string) {
        this.name = name;
        this.searchPhrase = searchPhrase;
    }

    abstract toString(): string;
    isWordNotFound(): boolean {
        return this.name == "WordNotFoundResponse";
    }
    isMultipleResults(): boolean {
        return this.name == "MultipleResultsResponse";
    }
    isStandardResult(): boolean {
        return this.name == "StandardResultResponse";
    }
}
export class WordNotFoundResponse extends GenericWordQueryResponse {
    constructor(word: string) {
        super("WordNotFoundResponse", word);
    }

    public get word(): string {
        return this.searchPhrase;
    }

    toString(): string {
        return `Word not found: ${this.searchPhrase}`;
    }
}
export class MultipleResultsResponse extends GenericWordQueryResponse {
    public readonly results: LinkedResult[];
    constructor(searchPhrase: string, results: { id: string; explanation: string }[]) {
        super("MultipleResultsResponse", searchPhrase);
        this.results = results.map(result => new LinkedResult(result.id, result.explanation));
    }

    toString(): string {
        return `Multiple results for ${this.searchPhrase}`;
    }
}

export class LinkedResult {
    public readonly id: string;
    public readonly explanation: string;
    constructor(id: string, explanation: string) {
        this.id = id;
        this.explanation = explanation;
    }
}
/**
 * Searches a string and returns the first enclosed in double quotes.
 * @param wholeString The string to search for the term inside quotes.
 * @returns
 */
function termInsideQuotes(wholeString: string, index = 1): string | undefined {
    wholeString = wholeString.replaceAll("„", '"');
    wholeString = wholeString.replaceAll("“", '"');
    const regex = /"([^"]*)"/;
    const match = regex.exec(wholeString);
    if (match == null) return undefined;
    return match[index];
}

function removeHTMLTags(html: string): string {
    return html.replace(/<[^>]*>/g, "");
}
