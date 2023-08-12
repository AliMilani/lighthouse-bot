import "dotenv/config.js";
import validateEnv from "./startup/validateEnv";
validateEnv(process.env);
import App from "./app";

const app = new App();
app.start();
// export default app;
