'use strict';

const express = require('express');
const parser = require('body-parser');
const cookieParser = require('cookie-parser');
const websokify = require('express-ws');
const createHash = require('crypto').createHash;


const app = express();
const cors = require('cors')
const host = 'https://osmosbackend.herokuapp.com/'


app.use(cors());
websokify(app);
app.use(parser.json());

app.use(cookieParser());

const users = new Map();

// получение списка всех пользователей
app.get('/api/users', function (req, res) {
	const r = [...users.values()].map(user => {
		user.password = undefined;
		return user;
	});
	res.json(r);
});


// создание нового пользователя
app.post('/api/users', function (req, res) {
	const body = req.body;
	if (body.login && body.password) {
		let flag = true;
		users.forEach( function (user) {
			if (user.login === body.login){
				flag = false;
			}
		});
		if (!flag) {
			return res.status(400).json({error: 'Пользователь уже существует'});
		}
		const hash = createHash('sha256');
		hash.update(JSON.stringify({
			login: body.login,
			password: body.password
		}));

		const id = hash.digest('hex');
		const user = {
			login: body.login,
			score: 0
		};

		users.set(id, user);
		res.cookie('secret', id, {path: '/', maxAge: 12 * 60 * 60 * 1000, domain: 'https://unpredictable.herokuapp.com'});
		res.cookie('secret', id, {path: '/', maxAge: 12 * 60 * 60 * 1000, domain: host});
		return res.json(user);
	}
	return res.status(400).json({error: 'нет логина и пароля'});
});

//проверка авторизовывался ли я сегодня
app.get('/api/me', function (req, res) {
	const secret = req.cookies.secret;
	console.log(`secret = ${secret}`);

	if (!secret) {
		return res.status(401).end();
	}

	if (!users.has(secret)) {
		return res.status(401).end();
	}

	res.json(users.get(secret));
});

// авторизация пользователя
app.post('/api/login', function (req,res) {
	const body = req.body;
	const secret = req.cookies.secret;
	const hash = createHash('sha256');
	hash.update(JSON.stringify({
		login: body.login,
		password: body.password
	}));

	if (body.login && body.password) {
		if (!users.has(hash)) {
			const id = hash;
			const user = {
				login: body.login,
				score: 0
			};
			users.get(id, user);
			res.cookie('secret', id, {path: '/', maxAge: 12 * 60 * 60 * 1000});
			res.cookie('secret', id, {path: '/', maxAge: 12 * 60 * 60 * 1000, domain: host});
			return res.json(user);
		} else {
			return res.status(400).json({error: 'Неверная пара логин/пароль'});
		}
	}
	return res.status(400).json({error: 'плохо'});
});


// разлогиниться

app.delete('/api/delete', function (req, res) {
	const body = req.body;
	const id = createHash('sha256');
	id.update(JSON.stringify({
		login: body.login,
		password: body.password
	}));
	req.cookies.secret = res.cookie('secret', id, {path: '/', maxAge: 0});
	req.cookies.secret = res.cookie('secret', id, {path: '/', maxAge: 0, domain: host});;
	res.status(200).end();
});

app.listen(process.env.PORT || 5000, () => {
	console.log(`App started on port ${process.env.PORT || 5000}`);
});
