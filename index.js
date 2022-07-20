const express = require('express');
require('dotenv').config();
const initDB = require('./db').initDB;
const cors = require('cors');

const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
    origin: 'https://synthusiast-frontend.vercel.app'
    
}))

initDB();

const routes = require('./routes/user');
app.use('/', routes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));