const express = require('express');
require('dotenv').config();
const initDB = require('./db').initDB;

const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

initDB();

const routes = require('./routes/user');
app.use('/', routes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));