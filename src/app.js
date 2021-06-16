import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

const {Pool} = pg;
const user = {
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
}
const connection = new Pool(user);

app.get('/categories', async (req,res)=>{
    try{
        const categories= await connection.query('SELECT * FROM categories');
        res.send(categories.rows);
    }
    catch{
        res.sendStatus(500);
    }
});

app.listen(4000,()=>{console.log('starting server')});