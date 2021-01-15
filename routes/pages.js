const e = require('express');
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth')

//RUTAS DE TODAS LAS VISTAS


router.get('/', authController.isLoggedIn, (req, res) =>{
    if(req.user){
        if(req.user.puesto == 'Gerente'){
            res.render('admin');}
            else{
        res.render('inicio')}

    }else{
    res.render('login');
    }
});
router.get('/registrate', (req, res) => {
    res.render('registrate');
});
router.get('/inicio', authController.inicio,  (req, res) => {
    if(req.user){
        res.render('inicio',{user:req.user});
    }
    else{
        res.redirect('/');
    }
    
});
//VISTA GERENTE
router.get('/admin',authController.isLoggedIn, (req, res) => {
    if(req.user){
        if(req.user.puesto == 'Gerente'){
        res.render('admin');}
        else{
            return res.render('inicio', {
                message: 'NO TIENES PERMISO DE ADMINISTRADOR'})
        }
    }
    else{
        res.redirect('/');
    }
});
router.get('/masproductos', (req, res) => {
    res.render('masproductos');
});

router.get('/surtir', (req, res) => {
    res.render('surtir');
});

router.get('/verproductos', (req, res) => {
    res.render('verproductos');
});

router.get('/vertiposcambio',authController.vertc, (req, res) => {
    if(TipoCambio){
        res.render('vertiposcambio',{TipoCambio});
    }
    else{
        res.redirect('/');
    }
});

router.get('/mascomidas', (req, res) => {
    res.render('mascomidas');
});
router.get('/editatc', (req, res) => {
    res.render('editatc');
});
router.get('/cortecaja', (req, res) => {
    res.render('cortecaja');
});
router.get('/editacomanda', (req, res) => {
    res.render('editacomanda');
});
router.get('/mascom', (req, res) => {
    res.render('mascom');
});

module.exports = router;