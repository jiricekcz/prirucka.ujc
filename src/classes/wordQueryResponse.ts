import jsdom from "jsdom";

export type WordQueryResponse = WordNotFoundResponse | MultipleResultsResponse | StandardResultResponse;

const IGNORE_TAGS = ["BR", "SUP", "A"];
export async function classifyWordQueryResponse(
    domObject: jsdom.JSDOM,
    searchPhrase: string
): Promise<WordQueryResponse> {
    const content = domObject.window.document.querySelector("#content");
    if (String(content?.children[1]?.className).length == 0) {
        const main = content?.children[1]; // main is the second child of content, the main element is the one cheked in the previous if statement.
        if (main === undefined) throw new Error("No main element found"); // if main is undefined, there is no main element, so there is no result.
        const word = main.children[0]?.children[0]?.children[0]?.innerHTML; // the first subelement of main includes the word
        const traits: Traits = {};
        // Page exists, parsing the traits
        for (let i = 1; i < main.children.length; i++) {
            const child = main.children[i];
            if (!child) continue;
            // If child is a "polozka", check all traits that can be "polozka"
            else if (child.className.includes("polozky")) {
                const innerHTML = child.innerHTML;
                const pureText = removeHTMLTags(innerHTML);
                if (pureText.startsWith("dělení")) traits.deleni = innerHTML.split("<")[0]?.split("dělení: ")[1];
                else if (pureText.startsWith("rod: ")) traits.rod = pureText.split("rod: ")[1];
                else if (pureText.startsWith("příklady")) {
                    const em = child?.getElementsByTagName("em")[0];
                    if (!em) {
                        console.log("Unknown příklady");
                        continue;
                    }
                    removeTags(em, "sup");
                    removeTags(em, "br");
                    traits.priklady = em.innerHTML.split("; ");
                } else if (child.innerHTML.startsWith("lze i:"))
                    traits.lzeI = [
                        ...collectionToArray(child.getElementsByTagName("a")).map((a) => {
                            return {
                                text: a.innerHTML,
                                id: new URL(a.href).searchParams.get("id") ?? undefined,
                            };
                        }),
                        ...collectionToArray(child.getElementsByTagName("span")).map((span) => {
                            return { text: span.innerHTML, id: undefined };
                        }),
                    ];
                else if (child.innerHTML.startsWith("příbuzná slova: "))
                    traits.pribuznaSlova = [
                        ...collectionToArray(child.getElementsByTagName("a")).map((a) => {
                            return {
                                text: a.innerHTML,
                                id: new URL(a.href).searchParams.get("id") ?? undefined,
                            };
                        }),
                        ...collectionToArray(child.getElementsByTagName("span")).map((span) => {
                            return { text: span.innerHTML, id: undefined };
                        }),
                    ];
                else if (child.innerHTML.startsWith("frazeologie: ")) traits.frazeologie = removeHTMLTags(child.innerHTML).split("frazeologie: ")[1]?.split("; ");
                else if (child.innerHTML.startsWith("poznámky k heslu: ")) traits.poznamky = removeHTMLTags(child.innerHTML).split("poznámky k heslu: ")[1];
                else if (child.innerHTML.startsWith("jiné je: ")) traits.jineJe = collectionToArray(child.getElementsByTagName("a")).map((a) => {
                    return {
                        text: a.innerHTML,
                        id: new URL(a.href).searchParams.get("id") ?? undefined,
                    };
                });
                else if (child.innerHTML.startsWith("význam: ")) traits.vyznam = removeHTMLTags(child.innerHTML).split("význam: ")[1];
                else if (child.innerHTML.startsWith("2. stupeň: ")) traits.stupen2 = removeHTMLTags(child.innerHTML?.split("2. stupeň: ")[1]?.split("<")[0] ?? "");
                else if (child.innerHTML.startsWith("3. stupeň: ")) traits.stupen3 = removeHTMLTags(child.innerHTML?.split("3. stupeň: ")[1]?.split("<")[0] ?? "");
                else console.log("Unknown polozka: " + pureText + "; While searching for " + searchPhrase);
            } else if (IGNORE_TAGS.includes(child.tagName)) continue;
            // If child tag is on the ignore list, continue
            else if (child.tagName === "DIV" && child.id.includes("bref")) {
                // Check all the external grammar references
                if (!traits.brefs) traits.brefs = [];
                const innerHTML = child.getElementsByTagName("h1")[0]?.innerHTML.split("<span")[0];
                if (!innerHTML) continue;
                traits.brefs.push(removeHTMLTags(innerHTML));
            } else if (child.tagName === "TABLE") {
                // Parse the table
                traits.tabulka = [];
                const tbody = child.getElementsByTagName("tbody")[0];
                const trs = tbody?.getElementsByTagName("tr") ?? [];
                for (let i = 0; i < trs.length; i++) {
                    const tr = trs[i];
                    const tds = tr?.getElementsByTagName("td") ?? [];
                    traits.tabulka[i] = [];
                    for (let j = 0; j < tds.length; j++) {
                        const td = tds[j];
                        if (!td) continue;
                        const colspan = td.colSpan;
                        const content = td.innerHTML;
                        traits.tabulka[i]?.push({ width: colspan, content });
                    }
                }
            } else if (child.innerHTML.startsWith("Další slovní charakteristiky a příklady: ")) // Parsing the korpus link
                traits.korpusLink = child.querySelector("a")?.href;
            else if (child.id == "dict_ssc") { // Parsing the ssc data
                const realContent = child.children[1];
                if (!realContent) {
                    console.log("No real content");
                    continue;
                }
                for (let i = 0; i < realContent.childNodes.length; i++) {
                    const child = realContent.childNodes[i];
                    if (!child) continue;
                    // TODO: Parse the content of SSC
                }
            } else if (child.id == "dict_ssjc") { // Parsing the ssjc data
                const realContent = child.children[1];
                if (!realContent) {
                    console.log("No real content");
                    continue;
                }
                for (let i = 0; i < realContent.childNodes.length; i++) {
                    const child = realContent.childNodes[i];
                    if (!child) continue;
                    // TODO: Parse the content of SSJC
                }
            } else if (child.tagName == "DIV" || child.innerHTML.includes("kademický slovník současné češtiny")) 
                traits.newDictLink = child.querySelector("a")?.href; // Parsing the new dict link
            else console.log("Unknown child: " + child.tagName + "; While searching for: " + searchPhrase);
        }
        if (!word) throw new Error("No word found");
        return new StandardResultResponse(word, traits);
    } else if (content?.children[1]?.className.includes("hledani")) {
        if (content?.children[2]?.innerHTML.includes("nebyl nalezen.")) {
            // Word not found
            const b = content.getElementsByTagName("b")[0]?.innerHTML; // Get the "word not found" text
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
        } else throw new Error("Unknown result 1 while searching for: " + searchPhrase);
    } else throw new Error("Unknown response 2 while searching for: " + searchPhrase);
    throw new Error("Unknown response 3 while searching for: " + searchPhrase);
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
export class StandardResultResponse extends GenericWordQueryResponse {
    public readonly traits: Traits;
    constructor(word: string, traits: Traits) {
        super("StandardResultResponse", word);
        this.traits = traits;
    }
    toString(): string {
        return `Standard result for ${this.searchPhrase}: ${JSON.stringify(this.traits)}`;
    }
}
export class MultipleResultsResponse extends GenericWordQueryResponse {
    public readonly results: LinkedResult[];
    constructor(searchPhrase: string, results: { id: string; explanation: string }[]) {
        super("MultipleResultsResponse", searchPhrase);
        this.results = results.map((result) => new LinkedResult(result.id, result.explanation));
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
type Traits = {
    deleni?: string;
    jineJe?: { text: string; id?: string }[];
    rod?: string;
    priklady?: string[];
    brefs?: string[];
    tabulka?: Array<{ content: string; width: number }[]>;
    korpusLink?: string;
    newDictLink?: string;
    lzeI?: { text: string; id?: string }[];
    pribuznaSlova?: { text: string; id?: string }[];
    frazeologie?: string[];
    poznamky?: string;
    vyznam?: string;
    stupen2?: string;
    stupen3?: string;
};

function removeTags(html: Element, tag: string): void {
    const sups = html.getElementsByTagName(tag) ?? [];
    const supsA: Element[] = [];
    for (let i = 0; i < sups?.length; i++) {
        const sup = sups[i];
        if (!sup) continue;
        supsA.push(sup);
    }
    supsA.forEach((sup) => sup.remove());
}
function collectionToArray<E extends HTMLElement>(collection: HTMLCollectionOf<E>): E[] {
    const array: E[] = [];
    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        if (!element) continue;
        array.push(element);
    }
    return array;
}
