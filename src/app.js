import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';
import {stripHtml} from "string-strip-html";

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

app.post('/categories', async (req,res)=>{
    try{
        const categories= await connection.query('SELECT * FROM categories');
        const categorieSchema = Joi.string().required().custom(value=>{
            if(categories.rows.find(r=>r.name===value)===undefined){
                return value;
            }
            else{
                throw new Error('categorie alredy exists');
            }
        });
        const newcategorie = stripHtml(req.body.name).result.trim();
        const validation = categorieSchema.validate(newcategorie)
        if(validation.error===undefined){
            const categorie= await connection.query('INSERT INTO categories (name) VALUES ($1)',[newcategorie]);
            res.sendStatus(201);
        }
        else{
            if(validation.error.details[0].type==='string.empty')res.sendStatus(400);
            else if(validation.error.details[0].type==='any.custom') res.sendStatus(409);
        }
    }
    catch(e){
        console.log(e)
        res.sendStatus(500);
    }
});

app.listen(4000,()=>{console.log('starting server')});