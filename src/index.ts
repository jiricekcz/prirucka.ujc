import * as testFunctions from "./functions/tests";
import * as queries from "./functions/queries";
import { WordQueryResponse } from "./classes/wordQueryResponse";
namespace API {
    /**
     * Checks if the landing page of the site returns a 200 status code. This does not check if the site lookup will work, but is an easy way to check if the site is up. 
     * @returns If the site is available, returns true. Else false.
     */
    export function testWebsite(): Promise<boolean> {
        return testFunctions.testWebsite();
    }

    /**
     * Looks up a word in the site and returns the result.
     * @param word The word to look up.
     * @returns Lookup result of the word.
     */
    export function wordQuery(word: string): Promise<WordQueryResponse> {
        return queries.wordQuery(word);
    }
}
export default API;

API.wordQuery("pán").then(r => {
    console.log(r);
})