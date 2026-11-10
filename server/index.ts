import { app } from "./app";
import { config } from "./config";

app.listen(config.port, () => {
  console.log(`Nordia API: http://localhost:${config.port}`);
});