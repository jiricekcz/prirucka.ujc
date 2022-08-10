import { URL } from "../constants";
import axios from "axios";
export async function testWebsite(): Promise<boolean> {
    try {
        const response = await axios.get(URL);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}
