const express = require("express");
const app = express();
const authRouter = require("./src/modules/auth/auth.routes");
const errorHandler = require("./src/middleware/errorHandler.js"); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/auth", authRouter);

app.use(errorHandler);

module.exports = app;