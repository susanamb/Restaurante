const express = require('express');
const authController = require('../controllers/auth');
const { route } = require('./pages');
const router = express.Router();

//RUTAS DE TODOS LOS POST, PARA VALIDAR Y GUARDAR DATOS
router.post('/registro', authController.registro);

router.post('/login', authController.login);

router.get('/inicio', authController.isLoggedIn, authController.inicio, (req, res) => {
    if(req.user){
        res.render('inicio',{user:req.user});
    }
    else{
        res.redirect('/');
    }
    
});

//ADMINISTRADOR
router.get('/admin', authController.admin);

router.post('/menuconsulta', authController.menus);

router.get('/tipocambio', authController.tipocambio);

router.post('/cambiatc', authController.cambiatc)

router.get('/editatc',(req,res)=>{
    res.render('editatc');
})

router.get('/vereporte', authController.vereportes);

router.get('/vereportegral', authController.vereportegral);

router.get('/cierretienda',authController.cierretienda);

//LOGOUT
router.get('/logout', authController.logout);



//GESTION DE PRODUCTOS
router.post('/productos', authController.productos);

router.post('/producto/:id', authController.updateprod);

router.get('/verproductos', authController.verproductos);

router.get('/masproductos', (req, res) => {
    res.render('masproductos');
});

router.get('/producto/:id', authController.producto);

router.get('/borraproducto/:id', authController.borraprod);

router.get('/surtir', authController.surtir);

router.post('/surtido',authController.surtido);

//GESTION DE COMIDAS
router.post('/mascomidas', authController.mascomida);

router.get('/vercomidas', authController.vercomidas);

router.post('/comida/:id', authController.updatecomida);

router.get('/mascomidas', (req, res) => {
    res.render('mascomidas');
});
router.get('/borracomida/:id', authController.borracomida);

router.get('/comida/:id', authController.comida)

//GESTION DE USUARIOS
router.get('/verusuarios', authController.verusuarios);

router.get('/usuario/:usuario', authController.usuario);

router.post('/usuario/:usuario', authController.actualizauser);

router.get('/registrate', (req, res) => {
    res.render('registrate');
});

router.get('/borrausuario/:usuario', authController.borrauser);

router.get('/arqueocaja', authController.arqueo);

router.get('/vercortes', authController.vercortes);

//GESTION DE ORDENES

router.post('/pedido', authController.pedido);

router.get('/vercomandas', authController.vercomandas);

router.get('/borracuenta/:nOrden',authController.borracuenta);

router.get('/cuenta/:nOrden',authController.cuenta);

router.get('/entrega/:nOrden/:descripcion',authController.entrega);

router.get('/pago/:nOrden', authController.pago);

router.post('/cambio/:nOrden',authController.cambio);

router.post('/cortecaja', authController.corte);

router.get('/editacuenta/:nOrden', authController.editacuenta);

router.post('/editac/:id',authController.editac);

router.get('/mascom',authController.mascom);

//TAQUERO
router.get('/vistataquero', authController.verordenes);


module.exports = router;