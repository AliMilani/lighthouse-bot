import { cleanEnv, str, url, ValidatorSpec } from "envalid";

type nodeEnvs = "development" | "production" | "test";

type Env = {
  [key: string]: string | undefined;
  NODE_ENV?: nodeEnvs;
};

type Spec = {
  [key: string]: ValidatorSpec<string>;
};

const validateEnv = (env: Env): void => {
  /* prettier-ignore */
  const defualtSpec:Spec = {
        NODE_ENV: str({
            choices: ["development", "production", "test"],
            desc: "The environment in which the app is running  (e.g. development, production)",
            example: "development",
        }),
        BOT_TOKEN: str({ desc: "The token of the bot" }),
    };

  const specByEnv: { [key in nodeEnvs]: Spec } = {
    production: {
      MONGODB_URI: url({
        desc: "The url to the mongodb instance",
        docs: "https://docs.mongodb.com/manual/reference/connection-string/",
      }),
    },
    development: {},
    test: {},
  };

  const nodeEnv = env.NODE_ENV;
  if (nodeEnv && specByEnv.hasOwnProperty(nodeEnv))
    cleanEnv(env, { ...defualtSpec, ...specByEnv[nodeEnv] });
  else
    throw new Error(
      `NODE_ENV must be one of ${Object.keys(specByEnv).join(
        ", "
      )} but got ${nodeEnv}`
    );
};

export default validateEnv;
