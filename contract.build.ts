import { getAllCompileCode } from "./contract/compileContract";
import * as dotenv from "dotenv";
dotenv.config();

(async () =>{
  await getAllCompileCode();
})();
