const express = require('express');
const app = express();
const hbs = require('express-handlebars')
const bodyParser = require('body-parser');
//const expressLayout = require('express-ejs-layouts');
//const bodyParser = require('body-parser');
const mysql = require('mysql');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');


dotenv.config({ path: './.env'})

const port = process.env.PORT || 3000;

// CONFIG LA BASE DE DATOS
const db = mysql.createConnection({
    //port:port,
    host: process.env.DATABASE_HOST, // ip of the server
    user: process.env.DATABASE_USER,
    password : process.env.DATABASE_PASS,
    database: process.env.DATABASE  
});

app.engine('.hbs', hbs({
    defaultLayout: 'layout',
    extname: '.hbs'
}))

app.set('view engine', 'hbs');
app.use('/static', express.static('public'))
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cookieParser())




//RUTAS 
app.use('/', require('./routes/pages'));
app.use('/api', require('./routes/api'));

//CONEXION CON LA BASE DE DATOS
db.connect( (error) => {
    if(error){
        console.log('Se produjo un error:', error);
    } else{
        console.log("Mysql Connected...")
    }
})
//CONEXION CON EL SERVIDOR
app.listen(port,() => {
    console.log(`ejecutando en http://localhost:${port}`)
});