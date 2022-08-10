import axios from "axios";
import jsdom from "jsdom";
import { URL } from "../constants";
import { classifyWordQueryResponse, WordQueryResponse } from "../classes/wordQueryResponse";

export async function wordQuery(word: string): Promise<WordQueryResponse> {
    const dom = await fetchWordQuery(word);
    return classifyWordQueryResponse(dom, word);
}

async function fetchWordQuery(word: string): Promise<jsdom.JSDOM> {
    const response = await axios.get(`${URL}`, {
        params: {
            slovo: word,
        },
    }).catch(e => {
        return e;
    });
    const dom = new jsdom.JSDOM(response.data);
    return dom;
}
