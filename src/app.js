import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import pg from 'pg';
import { stripHtml } from "string-strip-html";
import dayjs from 'dayjs';
import e from 'express';
import { async } from 'regenerator-runtime';

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const user = {
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
}
const connection = new Pool(user);

app.get('/categories', async (req, res) => {
    try {
        const categories = await connection.query('SELECT * FROM categories');
        res.send(categories.rows);
    }
    catch {
        res.sendStatus(500);
    }
});

app.post('/categories', async (req, res) => {
    try {
        const categories = await connection.query('SELECT * FROM categories');
        const categorieSchema = Joi.string().required().custom(value => {
            if (categories.rows.find(r => r.name === value) === undefined) {
                return value;
            }
            else {
                throw new Error('categorie alredy exists');
            }
        });
        const newcategorie = stripHtml(req.body.name).result.trim();
        const validation = categorieSchema.validate(newcategorie)
        if (validation.error === undefined) {
            await connection.query('INSERT INTO categories (name) VALUES ($1)', [newcategorie]);
            res.sendStatus(201);
        }
        else {
            if (validation.error.details[0].type === 'string.empty') res.sendStatus(400);
            else if (validation.error.details[0].type === 'any.custom') res.sendStatus(409);
        }
    }
    catch (e) {
        console.log(e)
        res.sendStatus(500);
    }
});

app.get('/games', async (req, res) => {
    try {
        let games;
        const nameIsLike = req.query.name === undefined ? "" : req.query.name;
        games = await connection.query(`SELECT games.*,categories.name AS "categoryName" 
        FROM games JOIN categories 
        ON games."categoryId" = categories.id 
        WHERE games.name ILIKE $1`,
            [nameIsLike + '%']);
        if (games.rowCount === 0) {
            res.sendStatus(404);
            return;
        }
        res.send(games.rows);
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.post('/games', async (req, res) => {
    try {
        const idList = await connection.query('SELECT id FROM categories');
        const gameList = await connection.query('SELECT name FROM games');
        const newGame = {
            name: stripHtml(req.body.name).result.trim(),
            image: stripHtml(req.body.image).result.trim(),
            stockTotal: req.body.stockTotal,
            categoryId: req.body.categoryId,
            pricePerDay: req.body.pricePerDay
        }
        const gameSchema = Joi.object({
            name: Joi.string().required().custom(value => {
                if (gameList.rows.find(g => g.name === value) === undefined) {
                    return value;
                }
                else {
                    throw new Error('game ja existe');
                }
            }),
            image: Joi.string(),
            stockTotal: Joi.number().required().min(1),
            categoryId: Joi.number().custom(value => {
                if (idList.rows.find(i => i.id === value) === undefined) {
                    throw new Error('ID nao encontrado');
                }
                else {
                    return value;
                }
            }, 'categoria'),
            pricePerDay: Joi.number().required().min(1)
        });
        const validation = gameSchema.validate(newGame)
        if (validation.error !== undefined) {
            if (validation.error.details[0].type === 'any.custom' && validation.error.details[0].path[0] === 'name') {
                res.sendStatus(409);
            }
            else {
                res.sendStatus(400);
            }
        }
        else {
            await connection.query(
                'INSERT INTO games (name,image,"stockTotal","categoryId","pricePerDay") VALUES ($1,$2,$3,$4,$5)',
                [newGame.name, newGame.image, newGame.stockTotal, newGame.categoryId, newGame.pricePerDay]
            );
            res.sendStatus(201)
        }


    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.get('/customers', async (req, res) => {
    try {
        const cpfIsLike = req.query.cpf === undefined ? "" : req.query.cpf;
        const customers = await connection.query(`SELECT * from customers WHERE cpf LIKE $1`, [cpfIsLike + "%"]);
        if (customers.rowCount === 0) {
            res.sendStatus(404);
            return;
        }
        res.send(customers.rows);

    }
    catch (e) {
        console.log(e);
        res.sendStatus(500)
    }
});

app.get('/customers/:id', async (req, res) => {
    const customer = await connection.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (customer.rowCount === 0) {
        res.sendStatus(404);
        return
    }
    res.send(customer.rows);
});

app.post('/customers', async (req, res) => {
    try {
        const cpfs = await connection.query('SELECT cpf from customers');
        const newCustomer = { ...req.body, name: stripHtml(req.body.name).result.trim() };
        const customerSchema = Joi.object({
            name: Joi.string().required(),
            phone: Joi.string().pattern(/^[0-9]{10,11}$/),
            cpf: Joi.string().pattern(/^[0-9]{11}$/).custom(v => {
                if (cpfs.rows.find(c => c.cpf === v) === undefined) {
                    return v;
                }
                else {
                    throw new Error('cpf ja existe');
                }
            }),
            birthday: Joi.date().less('now')
        });
        const validation = customerSchema.validate(newCustomer);
        if (validation.error === undefined) {
            await connection.query(
                'INSERT INTO customers (name,phone,cpf,birthday) VALUES ($1,$2,$3,$4)',
                [req.body.name, req.body.phone, req.body.cpf, req.body.birthday]
            );
            res.sendStatus(201);
        }
        else {
            validation.error.details[0].type === 'any.custom' ? res.sendStatus(409) : res.sendStatus(400);
        }
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.put('/customers/:id', async (req, res) => {
    try {
        const cpfs = await connection.query('SELECT cpf from customers');
        const ids = await connection.query('SELECT id from customers');
        const changeCustomer = { ...req.body, name: stripHtml(req.body.name).result.trim() };
        const customerSchema = Joi.object({
            name: Joi.string().required(),
            phone: Joi.string().pattern(/^[0-9]{10,11}$/),
            cpf: Joi.string().pattern(/^[0-9]{11}$/).custom(v => {
                if (cpfs.rows.find(c => c.cpf === v) === undefined) {
                    return v;
                }
                else {
                    throw new Error('cpf ja existe');
                }
            }),
            birthday: Joi.string().pattern(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/)
        });
        const validation = customerSchema.validate(changeCustomer);
        if (validation.error === undefined) {
            await connection.query(
                'UPDATE customers SET name=$1,phone=$2,cpf=$3,birthday=$4 WHERE id=$5',
                [req.body.name, req.body.phone, req.body.cpf, req.body.birthday, req.params.id]
            );

            ids.rows.find(i => i.id === parseInt(req.params.id)) === undefined ? res.sendStatus(404) : res.sendStatus(200);
        }
        else {
            validation.error.details[0].type === 'any.custom' ? res.sendStatus(409) : res.sendStatus(400);
        }
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.post('/rentals', async (req, res) => {
    try {
        const customersId = await connection.query('SELECT id from customers WHERE id = $1', [req.body.customerId]);
        const games = await connection.query('SELECT * from games WHERE id = $1', [req.body.gameId]);
        const gamesrented = await connection.query(`SELECT * from rentals WHERE "gameId" = $1 AND "returnDate" IS NULL`, [req.body.gameId])
        const rentalSchema = Joi.object({
            customerId: Joi.number().custom(value => {
                if (customersId.rowCount > 0) return value;
                else throw new Error('customer not found')
            }),
            gameId: Joi.number().custom(value => {
                if (games.rowCount > 0) {
                    if (gamesrented.rowCount < games.rows[0].stockTotal) return value;
                    else throw new Error('all games alredy rented');
                }
                else throw new Error('game not found')
            }),
            daysRented: Joi.number().min(1)
        });
        const validation = rentalSchema.validate(req.body);
        if (validation.error !== undefined) {
            console.log(validation.error)
            res.sendStatus(400)
            return
        }
        const newRent = {
            ...req.body,
            rentDate: dayjs().format(),
            originalPrice: games.rows[0].pricePerDay * req.body.daysRented,
            returnDate: null,
            delayFee: null
        }
        await connection.query(`INSERT INTO rentals 
        ("customerId","gameId","rentDate","daysRented","returnDate","originalPrice","delayFee")
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [newRent.customerId, newRent.gameId, newRent.rentDate, newRent.daysRented, newRent.returnDate, newRent.originalPrice, newRent.delayFee]);
        res.sendStatus(201)
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.get('/rentals', async (req, res) => {
    const querys = {
        gameId: req.query.gameId === undefined ? 0 : parseInt(req.query.gameId),
        customerId: req.query.customerId === undefined ? 0 : parseInt(req.query.customerId)
    };
    try {
        let operator='>';
        if (querys.gameId > 0 || querys.customerId > 0) {
            operator='=';
        }
        const result = await connection.query(`
            SELECT rentals.*, 
            jsonb_build_object('name',games.name,'id',games.id,'categoryId',games."categoryId",'categoryName',categories.name) AS game,
            jsonb_build_object('name',customers.name,'id',customers.id) AS customer 
            FROM rentals 
            JOIN games ON games.id=rentals."gameId" 
            JOIN categories ON games."categoryId"=categories.id 
            JOIN customers ON customers.id=rentals."customerId"
            WHERE games.id ${operator} $1 OR customers.id ${operator} $2`, [querys.gameId, querys.customerId])
        res.send(result.rows)
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
})

app.post('/rentals/:id/return', async (req, res) => {
    try {
        const rental = await connection.query(`SELECT rentals.*,games."pricePerDay" 
        FROM rentals JOIN games ON rentals."gameId"=games.id 
        WHERE rentals.id=$1`, [req.params.id]
        );
        if (rental.rowCount === 0) {
            res.sendStatus(404)
            return
        }
        if (rental.rows[0].returnDate !== null) {
            res.sendStatus(400)
            return
        }
        rental.rows[0].returnDate = dayjs().format();
        const returnSchedule = dayjs(rental.rows[0].rentDate).add(rental.rows[0].daysRented, 'day');
        rental.rows[0].delayFee = dayjs().diff(returnSchedule, 'day') * rental.rows[0].pricePerDay;
        await connection.query(`UPDATE rentals 
        SET "returnDate"=$1,"delayFee"=$2 
        WHERE id=$3`,
            [rental.rows[0].returnDate, rental.rows[0].delayFee, req.params.id]
        );
        res.sendStatus(200);
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.delete('/rentals/:id', async (req,res)=>{
    try{
        const verification = await connection.query(`SELECT * FROM rentals WHERE id=$1 AND "returnDate" IS NOT NULL` ,[req.params.id]);
        const del = await connection.query('DELETE FROM rentals WHERE id=$1 AND "returnDate" IS NULL',[req.params.id]);
        if(del.rowCount===0){
            if(verification.rowCount>0){
                res.sendStatus(400);
                return;
            }
            res.sendStatus(404);
            return;
        }
        res.sendStatus(200)
    }
    catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
})

app.listen(4000, () => { console.log('starting server') });