const express = require('express');


const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send({
    message: "AI Service is running!",
  });
});



module.exports = app;