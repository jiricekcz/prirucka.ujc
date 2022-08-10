const API = require("../lib/index.js").default;

const NONSENSICAL_WORDS = [
    "asdf",
    "qwerty",
    "zxcvb",
    "12345",
    "!@#$%^&*()",
    "~`1234567890-=[]\\;',./{}|:\"<>?",
    "asdadfsidfnbvioeng",
    "sdfsadfSADf",
];
const MULTIPLE_RESULT_WORDS = ["je", "on", "děl", "bez"];

const WORDS = {
    nouns: ["voda", "vody", "nádobí", "mládež", "armády", "lakomost", "demokracie", "pán", "muž", "předseda", "soudce", "hrad", "stroj", "žena", "růže", "píseň", "kost", "město", "moře", "kuře", "stavení", "hajný", "bytná", "vstupné", "hovězí", "kupé"],
    adjectives: ["vysoký", "vysoký", "nejvyšší", "mladý", "jarní", "otcův", "matčin"],
    pronouns: ["já", "on", "ona", "my", "vy", "oni", "nikdo", "jejich"],
};
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
});
jest.setTimeout(100_000);
test("Nouns work correctly", async () => {
    for (const word of WORDS.nouns) {
        const response = await API.wordQuery(word);
        if (!response.isStandardResult()) console.log("Word: " + word);
        expect(response.isStandardResult()).toBe(true);
    }
})
