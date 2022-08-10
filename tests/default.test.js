const API = require("../lib/index.js").default;

const NONSENSICAL_WORDS = ["asdf", "qwerty", "zxcvb", "12345", "!@#$%^&*()", "~`1234567890-=[]\\;',./{}|:\"<>?", "asdadfsidfnbvioeng", "sdfsadfSADf"];
const MULTIPLE_RESULT_WORDS = ["je", "on", "děl", "bez"]
test("Site accessible", async () => {
    expect(await API.testWebsite()).toBe(true);
});

test("Nonsensical words return not found results.", async () => {
    for (const word of NONSENSICAL_WORDS) {
        expect((await API.wordQuery(word)).isWordNotFound()).toBe(true);
    }
});
test("Multiple results words return multiple results", async () => {
    for (const word of MULTIPLE_RESULT_WORDS) {
        expect((await API.wordQuery(word)).isMultipleResults()).toBe(true);
    }
})