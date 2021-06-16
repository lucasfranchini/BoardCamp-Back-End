import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';
import {stripHtml} from "string-strip-html";
import { async } from 'regenerator-runtime';

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
            await connection.query('INSERT INTO categories (name) VALUES ($1)',[newcategorie]);
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

app.get('/games', async (req,res)=>{   
    try{
        let games;
        if(req.query.name===undefined){
            games = await connection.query('SELECT * FROM games');
        }
        else{
            games = await connection.query('SELECT * FROM games WHERE lower(name) LIKE $1',[req.query.name.toLowerCase()]);
        }
        res.send(games.rows);
    }
    catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

app.post('/games', async (req,res)=>{
    try{
        const idList = await connection.query('SELECT id FROM categories');
        const gameList = await connection.query('SELECT name FROM games');
        const newGame = {
            name: stripHtml(req.body.name).result.trim(),
            image:stripHtml(req.body.image).result.trim(),
            stockTotal:req.body.stockTotal,
            categoryId: req.body.categoryId,
            pricePerDay: req.body.pricePerDay
        }
        const gameSchema = Joi.object({
            name:Joi.string().required().custom(value=>{
                if(gameList.rows.find(g=>g.name===value)===undefined){
                    return value;
                }
                else{
                    throw new Error ('game ja existe');
                }
            }),
            image:Joi.string(),
            stockTotal: Joi.number().required().min(1),
            categoryId: Joi.number().custom(value=>{
                if(idList.rows.find(i=>i.id===value)===undefined){
                    throw new Error ('ID nao encontrado');
                }
                else{
                    return value;
                }
            },'categoria'),
            pricePerDay: Joi.number().required().min(1)
        });
        const validation =  gameSchema.validate(newGame)
        if(validation.error!==undefined){
            if(validation.error.details[0].type==='any.custom' && validation.error.details[0].path[0]==='name'){
                res.sendStatus(409);
            }  
            else{
                res.sendStatus(400);
            }
        }
        else{
            await connection.query(
                'INSERT INTO games (name,image,"stockTotal","categoryId","pricePerDay") VALUES ($1,$2,$3,$4,$5)',
                [newGame.name,newGame.image,newGame.stockTotal,newGame.categoryId,newGame.pricePerDay]
            );
            res.sendStatus(201)
        }
        
        
    }
    catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

app.listen(4000,()=>{console.log('starting server')});