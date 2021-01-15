const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
//var express = require('express');
const { promisify } = require('util');
const { parse } = require('path');


const db = mysql.createConnection({
    host: process.env.DATABASE_HOST, // ip of the server
    user: process.env.DATABASE_USER,
    password : process.env.DATABASE_PASS,
    database: process.env.DATABASE,  
});

//VERIFICACION Y VALIDACION DE DATOS

//INICIO DE SESION
exports.login =  async (req,res) =>{
    try{
        const{ usuario, pass} = req.body;
        if(!usuario || !pass){
            return res.status(400).render('login', {
                message: 'Escriba su usuario y clave'
            })
        }
        db.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario],async (error, results) =>{
            //console.log(results);
            //console.log(results[0].puesto)
            if(error){console.log(error)}
            if(results.length > 0){

            if(!(await bcrypt.compare(pass, results[0].clave)) ){
                res.status(401).render('login',{
                    message:'Usuario o clave incorrecta'
                })
            }
            else{
                const usuario = results[0].usuario;
                if(results[0].estatus == 'activo'){
                    return res.status(401).render('login',{
                        message:'Ya haz iniciado sesion'
                    })
                }else{
            
                const token = jwt.sign({usuario}, process.env.JWT_SECRET,{
                    expiresIn: process.env.JWT_EXPIRES_IN
                });
                //console.log('The token is', token);
                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                        ),
                    httpOnly: true
                }
                res.cookie('jwt', token, cookieOptions);
                db.query('UPDATE usuarios SET estatus =? WHERE usuario=?',['activo',usuario])

                if(results[0].puesto == 'Gerente'){
                    res.status(200).redirect('admin');}
                else if(results[0].puesto == 'Mesero' ){
                    res.status(200).redirect('inicio');}
                else if(results[0].puesto == 'Cajero'){
                    res.status(200).redirect('vercomandas');}
                else if(results[0].puesto == 'Taquero'){
                    res.render('vistataquero');}
                

                else{ res.status(401).render('login',{
                    message:'Ocurrio un error'
                })}
            }
                }
                }else{
                        res.status(401).render('login',{
                    message:'Usuario o clave incorrecta'
                })
                }
                
        })
    } catch(error){
        console.log('ocurrio un error',error)
    }
}

//REGISTRO DE USUARIOS
exports.registro = (req,res) =>{
    //console.log(req.body);

    const{ usuario, nombre, apellido, puesto, clave, confirmaclave, claveg} = req.body;

    
    db.query('SELECT usuario FROM usuarios WHERE usuario = ?', [usuario], async (error, results) => {
        if(error){
            console.log('ocurrio unerror', error);
        }
        if( results.length > 0){
            return res.render('registrate', {
                message: 'Usuario ya existente'
            })
        }
        else if( clave !== confirmaclave){
            return res.render('registrate', {
                message: 'Las contrasenas no coinciden'
            })
        }
         db.query("SELECT * FROM usuarios WHERE puesto =?",['Gerente'], async function(error, results, fields) {
        if(error){console.log('ocurrio un error', error)}
        else{
            for (let i = 0; i < results.length; i++) {
                var PassMatch = await bcrypt.compare(claveg, results[i].clave)
                if(PassMatch){
                    let hashPass = await bcrypt.hash(clave, 8);
                    //console.log(hashPass);
            
                    db.query('INSERT INTO usuarios SET ?', {usuario: usuario, nombre: nombre, apellido:apellido, puesto:puesto, clave:hashPass}, (error, results) => {
                        if(error){
                            console.log('hubo un error', error);
                        }
                        else{
                            return res.render('registrate', {
                                message: 'Registro exitoso'
                            })
                        }
                    })
                } 
            }
            return res.render('registrate',{
                message:'Clave de gerente incorrecta'
            })
             }
      });
        



    })

    
}

//VERIFICA COOKIES
exports.isLoggedIn = async (req,res,next) =>{
    //console.log(req.cookies);
    if(req.cookies.jwt){
        try {
            // VERIFICAR EL TOKEN 
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );

        //console.log(decoded);
        //console.log(decoded.usuario)

            //VERIFICAR EL USUARIO
            db.query('SELECT * FROM usuarios WHERE usuario = ?', [decoded.usuario],(error, results)=>{
                //console.log(results);

                if(!results){
                    return next();
                }
                else{
                req.user= results[0];
                return next();
                }
            })
        } catch (error) {
            console.log(error)
            return next();
        }
    }
    else{
    next();
}
}

//MUESTRA MENU EN EL INICIO
exports.inicio = async (req,res)=>{
    //console.log(req.cookies);
        if(req.cookies.jwt){
            try {
                const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                    process.env.JWT_SECRET
                    );
                const usuario = decoded.usuario
            //console.log(usuario)
            db.query('SELECT * FROM productos WHERE categoria = ? AND cantidad > 0',['bebida'], (error, results, fields) => {
                const productos = results;
                db.query('SELECT * FROM menucomidas',(error, results, fields) => {
                    const comidas = results;
                    
                if(error){
                    console.log('ocurrio un error', error)
                    
                }
                else{
                    res.render('inicio', {usuario,productos, comidas})
                }
                })
            })
        } catch (error) {
            console.log(error)
        }
        
        }else{
            res.redirect('/')
        }
    }

 //VISTA ADMINISTRADOR   
exports.admin = async (req,res) =>{
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
            db.query('SELECT puesto FROM usuarios WHERE usuario =?', [usuario], (error, result)=>{
                if(error){console.log(error)
                 res.redirect('/');}
                
                if(result[0].puesto == 'Gerente'){
                    db.query('SELECT nombre FROM productos WHERE cantidad < 10', (error, results, fields) => {
                        const faltantes = results;
                        //console.log(faltantes)
                        if( results.length > 0){
                            return res.render('admin', {
                                message: 'POCO PRODUCTO DE', faltantes})
                        }
                        else {
                            return res.render('admin')
                        }})
                }else{
                    return res.render('inicio', {
                        message:'NO TIENES PERMISO DE ADMINISTRADOR'})                }


                })

            
        } catch (error) {
            
        }
    }
   
}

//SELECCIONA MENU DEL ADMINISTRADOR
exports.menus = (req,res) =>{
    if(req.cookies.jwt){
    var menu = req.body.menu

    if (menu == "usuarios") {
        const user= "registrate"
        res.render('menuconsulta', {menu, user})
    }
    else if(menu == "productos"){
        const surte= "surtir";
        res.render('menuconsulta', {menu, surte})
    }
    else if(menu){
    res.render('menuconsulta', {menu})
    }
    }else{
        res.redirect('/')
    } 
}

//GESTION TIPO DE CAMBIO
exports.tipocambio= (req,res) =>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM TipoCambio',(error, results)=>{
            if(error){ console.log(error)
            res.redirect('admin')}
            else{
                var id = results.length
                //console.log(id)
                db.query('SELECT * FROM TipoCambio WHERE id = ?', [id],(error, result)=>{
                    const TipoCambio = result;
                    //console.log(TipoCambio)
                    return res.render('tipocambio',{TipoCambio});
                })
                
            };
        });
    }
    else{
        res.redirect('/')
    }
};

//CAMBIAR/ACTUALIZAR TIPO DE CAMBIO
exports.cambiatc = (req, res )=>{
    if(req.cookies.jwt){
        const dll = req.body.tc;
        var date = Date()
        var fecha = date.slice(0, 15);
        //console.log(fecha)
        db.query('INSERT INTO TipoCambio SET ?',{Fecha:fecha, tc:dll});
        //console.log(dll)
        res.render('admin');
    }
    else{
        req.redirect('/')
    }
}

//VER HISTORIAL DE LOS TIPOS DE CAMBIO
exports.vertc = async (req, res, next)=>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM TipoCambio',(error,results)=>{
            if(!results){
                return next();
            }
            else{
            TipoCambio= results;
            return next();
            }
        })
    }else{
        res.redirect('/');
    }
}

///GESTION DE PRODUCTOS

//GUARDAR PRODUCTOS
exports.productos = (req,res) =>{
    if(req.cookies.jwt){
    //console.log(req.body);
    const{ codigo, nombre, precio, unidad, categoria, img} = req.body;
    const name = nombre.replace(/\s/g, "");

    
    db.query('SELECT codigo FROM productos WHERE codigo = ?', [codigo], async (error, results) => {
        if(error){
            console.log('ocurrio unerror', error);
        }
        if( results.length > 0){
            return res.render('masproductos', {
                message: 'Producto ya existente'
            })
        }
        db.query('INSERT INTO productos SET ?', {codigo: codigo, nombre:nombre, precio:precio, unidad:unidad, categoria:categoria, img:img, name:name}, (error, results) => {
            if(error){
                console.log('hubo un error', error);
            }
            else{
                return res.render('masproductos', {
                    message: 'Registro exitoso'
                })
            }
        })
    }) 
    }else{
        res.redirect('/')
    }

}


//MUESTRA PRODUCTOS
exports.verproductos = (req,res) =>{
    //console.log(req.cookies);
    if(req.cookies.jwt){
    db.query('SELECT * FROM productos',(error, results, fields) => {
        const productos = results;
        //console.log(productos)
    if(error){
        console.log('ocurrio un error', error) 
    }
    else{
        res.render('verproductos', {productos})
    }
    })    
    }else{
        res.redirect('/')
    }
}
// EDITAR PRODUCTO
exports.producto = (req,res) =>{
    if(req.cookies.jwt){
    var id = req.params.id;
    //console.log(id)
    db.query('SELECT * FROM productos WHERE id = ? ',[id],(error, results, fields) => {
        const producto = results;
        //console.log(producto)
    if(error){
        console.log('ocurrio un error', error) 
    }
    else{
        res.render('editaprod', {producto})}
    }) 
    }else{ res.redirect('/')}   
};

//SURTIR PRODUCTOS
exports.surtir = (req,res) =>{
    if(req.cookies.jwt){
    db.query('SELECT id, nombre FROM productos',(error, results) =>{
        var productos = results;
        if(error){
            console.log('ocurrio un error', error)
        }
        else{
            res.render('surtir',{productos})
        }
        
    })
    }else{ res.redirect('/')}
};
//PRODUCTO SURTIDO Y ACTUALIZADO
exports.surtido = (req,res) =>{
    if(req.cookies.jwt){
    var {id, cantidad} = req.body;
    if(id == "non"){
        return res.render('surtir', {
            message: 'Seleccione producto a surtir', tipo:'warning'
        })}
    else{
    db.query('SELECT cantidad FROM productos WHERE id = ?', [id], (error, results, fields)=>{
        if(error){
            console.log(error)
        }
        else{
            //console.log(id)
            var actual = results[0].cantidad;
            var total = parseInt(cantidad) + parseInt(actual);
            //console.log(total);
            db.query('UPDATE productos SET cantidad =? WHERE id=?',[total,id],(error,results) =>{
                if(error){
                    console.log(error)
                    return res.render('surtir', {
                        message: 'Ocurrio un error, intente de nuevo', tipo:'danger'
                    })
                }
                else{
                    return res.render('confirma', {cosa: 'Producto', accion: 'Surti',a:'admin'})}
            })
        }
        })
        }
}else{
    return res.redirect('/')
}

}

//ACTUALIZA PRODUCTO
exports.updateprod = (req, res) =>{
    var id = req.params.id;
    //console.log(id);
    const{ nombre, precio, cantidad, unidad, cat} = req.body;

    db.query('UPDATE productos SET nombre =?, precio =?, cantidad =?, unidad =?, categoria =? WHERE id =? ', [nombre,precio,cantidad,unidad, cat,id], (error, results,fields) =>{
        if(error){
            console.log('Ocurrio un error', error);
        }
        else{
            //console.log(results)
                return res.render('confirma', {cosa: 'Producto', accion: 'Actualiza',a:'admin'})
        }
    })

}
//BORRA PRODUCTO
exports.borraprod = (req,res) => {
    const id = req.params.id;
    db.query('DELETE FROM productos WHERE id =?', [id],(error, result)=>{
        if(error){
            console.log(error)
            return res.render('verproductos', {
                message: 'Error al eliminar producto'
            })
        }else{
            return res.render('confirma', {cosa: 'Producto', accion: 'Elimina',a:'admin'})
        }
    })
}

///GESTION DE COMIDA

//GUARDA COMIDA
exports.mascomida = (req,res) =>{
    if(req.cookies.jwt){
    //console.log(req.body);
    const{ nombre, descripcion, precio, img} = req.body;
    const name = nombre.replace(/\s/g, "")
    
    db.query('SELECT nombre FROM menucomidas WHERE nombre = ?', [nombre], async (error, results) => {
        if(error){
            console.log('ocurrio un error', error);
        }
        if( results.length > 0){
            return res.render('mascomidas', {
                message: 'Comida ya existente'
            })
        }
        db.query('INSERT INTO menucomidas SET ?', { nombre:nombre, descripcion:descripcion, precio:precio, img:img, name:name}, (error, results) => {
            if(error){
                console.log('hubo un error', error);
            }
            else{
                return res.render('confirma', {cosa: 'Platillo', accion: 'Guarda',a:'admin'})
            }
        })
    })
    }else{
        return res.redirect('/')
    } 
}

//MUESTRA LAS COMIDAS
exports.vercomidas = (req,res) =>{
    if(req.cookies.jwt){
    db.query('SELECT * FROM menucomidas',(error, results, fields) => {
        const comidas = results;
        //console.log(comidas)
    if(error){
        console.log('ocurrio un error', error) 
    }
    else{
        res.render('vercomidas', {comidas})
    }
    })    
    }else{ res.redirect('/')}
}
//EDITAR COMIDAS
exports.comida = (req,res) =>{
    var id = req.params.id;
    //console.log(id)
    db.query('SELECT * FROM menucomidas WHERE id = ? ',[id],(error, results) => {
        const comida = results;
        //console.log(comida)
    if(error){
            console.log('ocurrio un error', error) 
    }
    else{
        res.render('editacomida', {comida})}
    })    
}
//ACTUALIZA LAS COMIDAS
exports.updatecomida = (req, res) =>{
    var id = req.params.id;
    //console.log(id);
    const{ nombre,descripcion, precio} = req.body;

    db.query('UPDATE menucomidas SET nombre =?, descripcion =?, precio =? WHERE id =? ', [nombre,descripcion,precio,id], (error, results,fields) =>{
        if(error){
            console.log('Ocurrio un error', error);
        }
        else{
            //console.log(results)
            return res.render('confirma', {cosa: 'Comida', accion: 'Actualiza',a:'admin'})
        }
    })

}
//ELIMINA COMIDA
exports.borracomida = (req,res) => {
    const id = req.params.id;
    db.query('DELETE FROM menucomidas WHERE id =?', [id],(error, result)=>{
        if(error){
            console.log(error)
            return res.render('vercomidas', {
                message: 'Error al eliminar platillo'
            })
        }else{
            return res.render('confirma', {cosa: 'Platillo', accion: 'Elimina',a:'admin'})
        }
    })
}

///GESTION DE USUARIOS

//MUESTRA LOS USUARIOS
exports.verusuarios = (req,res) =>{
    if(req.cookies.jwt){
    db.query('SELECT * FROM usuarios',(error, results, fields) => {
        const usuarios = results;
        //console.log(usuarios)
    if(error){
        console.log('ocurrio un error', error) 
    }
    else{
        res.render('verusuarios', {usuarios})
    }
    })  
    }else{ res.redirect('/')}  
}

//EDITA USUARIO
exports.usuario = (req,res) =>{
    var usuario = req.params.usuario;
    //console.log(usuario)
    db.query('SELECT * FROM usuarios WHERE usuario = ? ',[usuario],(error, results, fields) => {
        const usuario = results;
        //console.log(usuario)
    if(error){
        console.log('ocurrio un error', error) 
    }
    else{
        res.render('editausuario', {usuario})}
    })    
}
//ACTUALIZA USUARIO
exports.actualizauser = async (req, res)=>{
    if(req.cookies.jwt){
    const{nombre, apellido, puesto, clave, confirmaclave, claveg} = req.body;
    //console.log('hola')
    db.query("SELECT * FROM usuarios WHERE puesto =?",['Gerente'], async function(error, results, fields) {
        if(error){console.log('ocurrio un error', error)}
        else{
            for (let i = 0; i < results.length; i++) {
                var PassMatch = await bcrypt.compare(claveg, results[i].clave)
                if(PassMatch){
                    var usuario = req.params.usuario;
                    if(clave !== confirmaclave){ 
                        return res.render('editausuario',{
                        message:'las claves no coinciden'
                    })}
                    else{
                        let hashPass = await bcrypt.hash(clave, 8);
                        db.query('UPDATE usuarios SET nombre =?, apellido =?, puesto =?, clave =? WHERE usuario =?',[nombre, apellido, puesto, hashPass,usuario],(error, result)=>{
                            if(error){ 
                                console.log(error)}
                            else{
                                return res.render('confirma', {cosa:'Usuario', accion:'Actualiza',a:'admin'})
                            }
                        })
                    }      
                } 
            }
            return res.render('editausuario',{
                message:'Clave de gerente incorrecta'
            })
             }
      });
    }else{
        res.redirect('/')
    }
}

//ELIMINA USUARIO
exports.borrauser = (req,res) => {
    const usuario = req.params.usuario;
    db.query('DELETE FROM usuarios WHERE usuario =?', [usuario],(error, result)=>{
        if(error){
            console.log(error)
            return res.render('verusuarios', {
                message: 'Error al eliminar usuario'
            })
        }else{
            return res.render('confirma', {cosa: 'Usuario', accion: 'Elimina',a:'admin'})
        }
    })
}

//VER ARQUEOS DE CAJA
exports.arqueo = (req,res) =>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM arqueo',(error, results) => {
            const arqueo = results;
            //console.log(usuarios)
        if(error){
            console.log('ocurrio un error', error) 
        }
        else{
            res.render('arqueocaja', {arqueo})
        }
        })  
        }else{ res.redirect('/')}  
}

//VER CORTES DE CAJA
exports.vercortes = (req,res)=>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM cortecajero',(error, result)=>{
            if(error){console.log(error)}
            else{
            const corte = result;
            res.render('vercortes', {corte})
            }
        })
    }else{
        res.redirect('/')
    }
}

//VER REPORTES DE LAS VENTAS
exports.vereportes = async(req, res) =>{
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
            db.query('SELECT puesto FROM usuarios WHERE usuario =?', [usuario], (error, result)=>{
                if(error){console.log(error)
                }
                
                if(result[0].puesto == 'Gerente'){
                    db.query('SELECT * FROM reporteventas', (error,results)=>{
                        if(error){console.log(error)}
                        else{
                            var date = Date();
                            var fecha = date.slice(0, 15);
                            const reporte = results;
                            return res.render('vereporte',{fecha,reporte})
                        }
                    })
                }else{
                    return res.render('inicio', {
                        message:'NO TIENES PERMISO DE ADMINISTRADOR'})     
                }
            })
        } catch (error) {
            console.log(error)
        }
        
    }else{
        res.redirect('/')
    }

}
//VER REPORTE GENERAL VENTAS DIARIAS
exports.vereportegral = async (req,res)=>{
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
            db.query('SELECT * FROM usuarios WHERE usuario =?', [usuario], (error, result)=>{
                if(error){console.log(error)
                }
                
                if(result[0].puesto == 'Gerente'){
                    db.query('SELECT * FROM reportegeneral', (error,results)=>{
                        if(error){console.log(error)}
                        else{
                            const reporteg = results;
                            return res.render('vereporte',{reporteg})
                        }
                    })
                }else{
                    return res.render('inicio', {
                        message:'NO TIENES PERMISO DE ADMINISTRADOR'})     
                }
            })
        } catch (error) {
            console.log(error)
        }
        
    }else{
        res.redirect('/')
    }
}

///GESTION DE ORDENES

//REGISTRO DE ORDENES
exports.pedido = async (req, res) =>{
    const orden = req.body
    var mesa =req.body.mesa
    console.log(orden)
    if(mesa == undefined){
        mesa = 0;
    }
    //console.log(mesa)
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
             let cobro=[];   
            db.query('SELECT * FROM comandas WHERE mesa =? ', [mesa],(error, results) => {
                if(error){
                    console.log('ocurrio un error', error);
                }
                if( results.length > 0 && results[0].mesa != 0){
                    console.log('mesa ocupada')
                    let X = [orden];
                    global.x = X;
                    return res.render('mascom');
                }
                else{ 
                    db.query('INSERT INTO comandas SET ?',{mesa:mesa, mesero:usuario})
                    //console.log(norden)      
                    db.query('SELECT * FROM comandas WHERE mesa =?',[mesa],(error, comanda)=>{
                        if(error){console.log(error)}
                        else{
                            var mes= 0;
                            for (let i = 0; i < comanda.length; i++) {
                                if(comanda[i].cobro > 0){
                                    console.log('esta orden ya esta')
                                }
                                else{
                                    mes=i;
                                }
                            }
                            var norden = comanda[mes].nOrden
                            db.query("SELECT * FROM menucomidas", function(error, resul) {
                                if(error){console.log('ocurrio un error', error)}
                                else{
                                    let cobroc =0;
                                    for (let i = 0; i < resul.length; i++) {
                                        var n = resul[i].name;
                                        console.log(n);
                                        var or = 0
                                        var extra = ""
                                        if(orden[n]>0){
                                            console.log('con todo')
                                            or = or + parseInt(orden[n])
                                            
                                        }

                                        if(orden[n+'sc'] > 0){
                                            console.log('sin cebolla');
                                            var c = orden[n+'sc']
                                            or=or + parseInt(c)
                                            extra = extra + c+" sin cebolla "

                                            console.log(extra)
                                        }
                                        
                                        if(orden[n+'ss'] > 0){
                                            console.log('sin salsa');
                                            var c = orden[n+'ss']
                                            or = or + parseInt(c)
                                            extra = extra + c+" sin salsa "                                        
                                        }
                                        
                                        if(orden[n+'sv'] > 0){
                                            console.log('sin verdura');
                                            var c = orden[n+'sv']
                                            or=or + parseInt(c)
                                            extra = extra + c+" sin verdura "
                                        }
                                        //var mesa = orden.mesa;
                                        console.log(or)
                                        if(or > 0){
                                            var preciou = resul[i].precio;
                                            var preciot = parseInt(preciou) * parseInt(or);
                                            cobroc = cobroc + preciot;
                                            console.log(cobroc)
                                            db.query('INSERT INTO ordenes SET ?', {nOrden:norden, cantidad:or, descripcion:n, preciou:preciou, preciot: preciot, taquero: 'si',notas:extra})
                                        }        
                                    }
                                    cobro.push(cobroc)
                                    //console.log(cobroc)
                                }
                              });
                              db.query("SELECT * FROM productos", function(error, results, fields) {
                                if(error){console.log('ocurrio un error', error)}
                                else{
                                    let cobrob = 0;
                                    for (let i = 0; i < results.length; i++) {
                                        var n = results[i].name
                                        var a = orden[n]
                                        //var mesa = orden.mesa
                                        if(a > 0){
                                            var preciou = results[i].precio;
                                            var preciot = parseInt(preciou) * parseInt(a);
                                            cobrob = cobrob + preciot;
                                            db.query('INSERT INTO ordenes SET ?', {nOrden:norden, cantidad:a, descripcion:n, preciou:preciou, preciot: preciot, taquero: 'no'},(errors, result)=>{
                                                if(errors){console.log(errors)}
                                            })
                                        }                                
                                    }
                                    cobro.push(cobrob) 
                                    //console.log(cobro) 
                                    let cobrot= cobro[0] + cobro[1];
                                    //console.log(cobrot)
                                    db.query('SELECT * FROM TipoCambio',(error, results)=>{
                                        if(error){ console.log(error)
                                        }
                                        else{
                                            var id = results.length
                                            //console.log(id)
                                            db.query('SELECT * FROM TipoCambio WHERE id = ?', [id],(error, result)=>{
                                                if(error){console.log(error)}
                                                let dll = cobrot / result[0].tc;
                                                dll = dll.toFixed(2);
                                                //console.log(dll)
                                                db.query('UPDATE comandas SET cobro=?, dll=? WHERE nOrden=?',[ cobrot, dll, norden])
                                                return res.render('confirma',{cosa:'Orden', accion:'Guarda',a:'inicio'});
                                            })
                                            
                                        };
                                    });                           
                                }
                              });
                        }

                    })
                    
                      
                }
            })           
        } catch (error) {
            console.log(error);
            res.redirect('inicio');           
        }
    }
};// end guarda orden


// AGREGAR MAS COMIDA A LA ORDEN
exports.mascom = (req,res)=>{
    if(req.cookies.jwt){        
          const orden = global.x
          //console.log(orden)
          let mesa = orden[0].mesa
          console.log('mesa: ',mesa)
        let cobro=[];   
        db.query('SELECT * FROM comandas WHERE mesa=?',[mesa],(error, results)=>{
            if(error){
                console.log(error)
                res.send('Ocurrio un error')}
                else{
                    //console.log(results)
                    norden = results[0].nOrden
                    //console.log(norden)
                    db.query("SELECT * FROM menucomidas", function(error, resul) {
                        if(error){console.log('ocurrio un error', error)}
                        else{
                            let cobroc =0;
                            for (let i = 0; i < resul.length; i++) {
                                var n = resul[i].name;
                                        console.log(n);
                                        var or = 0
                                        var extra = ""
                                        if(orden[0][n]>0){
                                            console.log('con todo')
                                            or = or + parseInt(orden[0][n])
                                            
                                        }

                                        if(orden[0][n+'sc'] > 0){
                                            console.log('sin cebolla');
                                            var c = orden[0][n+'sc']
                                            or=or + parseInt(c)
                                            extra = extra + c+" sin cebolla "

                                            console.log(extra)
                                        }
                                        
                                        if(orden[0][n+'ss'] > 0){
                                            console.log('sin salsa');
                                            var c = orden[0][n+'ss']
                                            or = or + parseInt(c)
                                            extra = extra + c+" sin salsa "                                        
                                        }
                                        
                                        if(orden[0][n+'sv'] > 0){
                                            console.log('sin verdura');
                                            var c = orden[0][n+'sv']
                                            or=or + parseInt(c)
                                            extra = extra + c+" sin verdura "
                                        }
                                        //var mesa = orden.mesa;
                                        console.log(or)
                                //var a = orden[0][n];
                                if(or > 0){
                                    var preciou = resul[i].precio;
                                    var preciot = parseInt(preciou) * parseInt(or);
                                    console.log(preciou,':',preciot)
                                    cobroc = cobroc + preciot;

                                    db.query('INSERT INTO ordenes SET ?', {nOrden:norden, cantidad:or, descripcion:n, preciou:preciou, preciot: preciot, taquero: 'si',notas:extra},(errors, result)=>{
                                        if(errors){console.log(errors)}
                                    })
                                }
                                 
                            }
                            cobro.push(cobroc)
                            //console.log(cobroc)
                        }
                      });
                      db.query("SELECT * FROM productos", function(error, results, fields) {
                        if(error){console.log('ocurrio un error', error)}
                        else{
                            let cobrob = 0;
                            
                            for (let i = 0; i < results.length; i++) {
                                var n = results[i].name
                                var a = orden[0][n]
                                //var mesa = orden.mesa
                                if(a > 0){
                                    var preciou = results[i].precio;
                                    var preciot = parseInt(preciou) * parseInt(a);
                                    cobrob = cobrob + preciot;
                                    db.query('INSERT INTO ordenes SET ?', {mesa:mesa, cantidad:a, descripcion:n, preciou:preciou, preciot: preciot, taquero: 'no'},(errors, result)=>{
                                        if(errors){console.log(errors)}
                                    })
                                }                                
                            }
                            cobro.push(cobrob) 
                            //console.log(cobro) 
                            let cobrot= cobro[0] + cobro[1];
                            db.query('SELECT * FROM comandas WHERE mesa =?',[mesa],(error,resul)=>{
                                if(error){ console.log(error)}
                                cobrot = cobrot + parseFloat(resul[0].cobro)
                                db.query('SELECT * FROM TipoCambio',(error, results)=>{
                                    if(error){ console.log(error)
                                    }
                                    else{
                                        var id = results.length
                                        //console.log(id)
                                        db.query('SELECT * FROM TipoCambio WHERE id = ?', [id],(error, result)=>{
                                            if(error){console.log(error)}
                                            let dll = cobrot / result[0].tc;
                                            dll = dll.toFixed(2);
                                            //console.log(dll)
                                            db.query('UPDATE comandas SET cobro=?, dll=? WHERE mesa=?',[ cobrot, dll, mesa])
                                            return res.render('confirma',{cosa:'Orden', accion:'Guarda',a:'inicio'});
    
                                        })
                                        
                                    };
                                });  
                            })
                                                     
                        }
                      });

                }
        })
    }else{
        res.redirect('/')
    }
}
// VER COMANDAS PENDIENTES
exports.vercomandas = async (req, res)=>{
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
            db.query('SELECT * FROM comandas',(error,results)=>{
                var comandas = results
                return res.render('vercomandas', {comandas})
            })           
        } catch (error) {
            console.log(error)
            
        }
    }    
};
//CANCELAR UNA ORDEN
exports.borracuenta = (req,res)=>{
    if(req.cookies.jwt){
        const nOrden = req.params.nOrden       
        db.query('DELETE FROM ordenes WHERE nOrden =?',[nOrden]);
        db.query('DELETE FROM comandas WHERE nOrden =?',[nOrden]);
        console.log('orden eliminada');
        res.render('confirma',{cosa:'Pedido', accion:'Elimina',a:'vercomandas'})
    }else{
        res.redirect('/')
    }
}

//EDITAR LA CUENTA YA EXISTENTE 
exports.editacuenta = (req,res)=>{
    if(req.cookies.jwt){
        const nOrden = req.params.nOrden;
        db.query('SELECT * FROM ordenes WHERE nOrden =?',[nOrden],(error,results)=>{
            if(error){console.log(error)}
            else{
                const comanda = results;
                res.render('editacomanda',{comanda});
            }
        })
    }else{
        res.redirect('/')
    }
}
//EDITA platillo seleccionado
exports.editac = (req, res)=>{
    if(req.cookies.jwt){
        const id = parseInt(req.params.id);
        var {cant, accion} = req.body
        db.query('SELECT * FROM ordenes WHERE id =?',[id],(error, result)=>{
            if(error){console.log(error)}
            else{
                cant= parseInt(cant)
                const norden = parseInt(result[0].nOrden)
                var antes = parseInt(result[0].cantidad)
                var menos = antes-cant
                //console.log(dif)
                if(result[0].taquero == 'ya'){
                    return res.render('confirma', {com: 'Este pedido no se puede cambiar porque ya se entrego',a:'vercomandas'})
                }else{
                    if( accion == 'Cambia'){
                        var total = parseFloat(result[0].preciou) * cant;
                        menos = parseFloat(result[0].preciou) * menos;
                        db.query('UPDATE ordenes SET cantidad =?, preciot =? WHERE id =?',[cant,total,id]);
                    }
                    else if( accion == 'Cancela'){
                        menos = parseFloat(result[0].preciot)
                        db.query('DELETE FROM ordenes WHERE id=?',[id]);
                
                    }
                    else{
                        console.log('opcion incorrecta')
                        return res.render('inicio')
                    }
                    db.query('SELECT * FROM comandas WHERE nOrden =?',[norden],(error, results)=>{
                        if(error){console.log(error)}
                        else{
                            var a = parseFloat(results[0].cobro) - menos
                            db.query('SELECT * FROM TipoCambio ORDER BY id DESC LIMIT 1',(error, resul) =>{
                                if(error){console.log(error)}
                                else{
                                    var dol = a / parseFloat(resul[0].tc)
                                    dol = dol.toFixed(2)
                                    if(dol <= 0 ){
                                        db.query('DELETE FROM comandas WHERE nOrden =?',[norden]);    
                                        }else{
                                            db.query('UPDATE comandas SET cobro=?, dll=? WHERE nOrden=?',[a,dol,norden])
                                        }
                                    return res.render('confirma', {cosa: 'Platillo', accion: 'Modifica',a:'vercomandas'})
                                    }
                            })
                        }       
                    })
                }}
        })
        
    }else{
        res.redirect('/')
    }
}

//ENTREGA DE UN PLATO
exports.entrega = (req,res)=>{
    if(req.cookies.jwt){
        const nOrden = req.params.nOrden
        const descripcion = req.params.descripcion
        db.query('UPDATE ordenes SET taquero =? WHERE descripcion=? AND nOrden=?',['ya',descripcion,nOrden])
        return res.render('confirma', {cosa: 'Platillo', accion: 'Entrega',a:'vistataquero'})

    }else{
        res.redirect('/')}
}

//COBRAR LA CUENTA
exports.cuenta = async (req, res)=>{
    if(req.cookies.jwt){
      try {
        const nOrden = req.params.nOrden;
        const decoded = await promisify(jwt.verify)(req.cookies.jwt,
            process.env.JWT_SECRET
            );
        const usuario = decoded.usuario
        db.query('SELECT * FROM ordenes WHERE nOrden  =?',[nOrden],(error, results)=>{
            if(error){
                console.log(error);
            }
            else{
                const orden = results;
                
                db.query('SELECT * FROM comandas WHERE nOrden = ?',[nOrden],(error,result)=>{
                    if(error){
                        console.log(error)
                    }
                    else{
                        const cobro = result;
                        const mesa = result[0].mesa
                        return res.render('cuenta', {mesa:mesa, orden, cobro})
                    }
                })
            }
        })
      } catch (error) {
          console.log(error)
          return res.redirect('/')
      }  
    };
}
//PAGO DE CUENTA
exports.pago = async(req, res)=>{
    if(req.cookies.jwt){
        const nOrden = req.params.nOrden;
        db.query('SELECT * FROM comandas WHERE nOrden =?',[nOrden], (error, results)=>{
            if(error){console.log(error)}
            else{
                const comanda = results;
                db.query('SELECT * FROM TipoCambio ORDER BY id DESC LIMIT 1',(error, result) =>{
                    if(error){
                        console.log(error)
                    }else{
                        var tc = result[0];
                        //console.log(tc)
                        return res.render('pago',{comanda,tc:tc })
                    }
                })
            };
        })
    }else{
        res.redirect('/')
    }
}

//CAMBIO 
exports.cambio = async (req, res) =>{
    if(req.cookies.jwt){
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
            const nOrden = req.params.nOrden;
            var mn = parseFloat(req.body.mn);
            var dll = parseFloat(req.body.dll);
            var tarjeta = parseFloat(req.body.tarjeta);
            var cambio = 0;
            db.query('SELECT * FROM TipoCambio ORDER BY id DESC LIMIT 1',(error, result) =>{
                if(error){
                    console.log(error)
                }else{
                    //total del pago ingresado
                    let tc = parseFloat(result[0].tc)
                    var dllt = dll * parseFloat(tc)
                    let recibido =mn + tarjeta + dllt
                    //console.log('recibido: ',recibido)   
                    db.query('SELECT * FROM comandas WHERE nOrden =?',[nOrden],(error, results)=>{
                        if(error){
                            console.log(error)
                        }else{
                            let tl = results[0].cobro
                                if(tarjeta <= tl){
                                    //guardo todo el valor en tarjeta
                                    tl = tl-tarjeta;
                                    if(dllt <= tl){
                                        //guardo todo el valor de dolar
                                        tl = tl-dllt;
                                        if(mn < tl){
                                            console.log('TE FALTA DINERO');
                                            return res.render('pago',{
                                                message:'Fondos insuficientes'
                                            });
                                        }else{

                                            //console.log(tl)
                                            cambio = mn - parseFloat(tl); 
                                            console.log(cambio.toFixed(2));    
                                        }                                    
                                    }else
                                    {                                       
                                        cambio = dllt - parseFloat(tl); 
                                        var camdol = cambio
                                        tl=0;
                                    }
                                    db.query('SELECT * FROM ordenes WHERE nOrden =? AND taquero =?',[nOrden,'no'],(error, orden)=>{
                                        if(error){console.log(error)}
                                        else{
                                            console.log(orden)
                                            db.query('SELECT * FROM productos WHERE categoria =?',['bebida'],(errors, prods)=>{
                                                if(error){console.log(errors)}
                                                for (let i = 0; i < orden.length; i++) {
                                                    for (let j = 0; j < prods.length; j++) {
                                                        if(prods[j].name == orden[i].descripcion){
                                                            var inventario = parseInt(prods[j].cantidad) - parseInt(orden[i].cantidad)
                                                            db.query('UPDATE productos SET cantidad =? WHERE name=?',[inventario, prods[j].name])
                                                            //console.log('producto actualizado: ', prods[j].nombre)
                                                        }                                                        
                                                    }
                                                    //  INVENTARIO                                                  
                                                }
                                            })
                                        }
                                    })
                                    db.query('SELECT * FROM ordenes WHERE nOrden =?',[nOrden],(errors, orden)=>{
                                        if(errors){console.log(errors)}
                                        else{
                                            db.query('SELECT * FROM reporteventas',(error, reporte)=>{
                                                if(error){console.log(error)}
                                                else{
                                                    for (let i = 0; i < orden.length; i++) {
                                                        var a = 0;
                                                        for (let j = 0; j < reporte.length; j++) {
                                                           if(reporte[j].descripcion == orden[i].descripcion){
                                                               //console.log(orden[i].descripcion)
                                                               var rv = parseInt(reporte[j].cantidad) + parseInt(orden[i].cantidad);
                                                               var tl = parseFloat(rv) * parseFloat(orden[i].preciou)
                                                               db.query('UPDATE reporteventas SET cantidad =?, total =? WHERE descripcion=?',[rv,tl, orden[i].descripcion])
                                                                a=a+1;
                                                                //console.log(a)
                                                            }     
                                                        }
                                                        if(a == 0){
                                                            db.query('INSERT INTO reporteventas SET ?',{descripcion:orden[i].descripcion, cantidad:orden[i].cantidad, total:orden[i].preciot})
                                                        } 
                                                    }
                                                }
                                            })
                                        }
                                    })
                                    db.query('DELETE FROM ordenes WHERE nOrden =? ',[nOrden]);
                                    db.query('INSERT INTO pagos SET ?',{usuario:usuario,mn:tl, dll:dll, tarjeta:tarjeta, total:results[0].cobro});
                                    db.query('SELECT * FROM arqueo WHERE usuario =?',[usuario],(error, results)=>{
                                        if(error){console.log(error)}
                                        else{
                                            if(results.length > 0){
                                            //console.log('venta mn: ', tl)
                                            tl = tl + parseFloat(results[0].mn)
                                            //console.log('total deventas: ', tl)
                                            dll = dll + parseFloat(results[0].dll)
                                            tarjeta = tarjeta + parseFloat(results[0].tarjeta)
                                            //console.log('equivalente de dolar a mn: ',dllt)
                                            var dol = dll * tc
                                            //console.log(dol)
                                            var totalvtas = tl + dol + tarjeta;
                                            if(camdol){
                                                console.log('amos a restarle al efectivo:',camdol);
                                                var mon = parseFloat(results[0].mn) - camdol
                                                db.query('UPDATE arqueo SET mn =?, dll =?, tarjeta =?, totalvtas =? WHERE usuario=?',[mon,dll,tarjeta,totalvtas, usuario])
                                            }else{
                                            db.query('UPDATE arqueo SET mn =?, dll =?, tarjeta =?, totalvtas =? WHERE usuario=?',[tl,dll,tarjeta,totalvtas, usuario])
                                            }
                                            }else{
                                                var dol = dll*tc;
                                                var totalvtas = tl + dol + tarjeta;
                                                db.query('INSERT INTO arqueo SET ?',{usuario:usuario,mn:mn,dll:dol,tarjeta:tarjeta,totalvtas:totalvtas})
                                            }
                                        }
                                    })
                                            //console.log('su cambio es: ',cambio);
                                            db.query('DELETE FROM comandas WHERE nOrden =?',[nOrden]);
                                            cambio = cambio.toFixed(2);
                                            return res.render('cambio',{nOrden,cambio})
                                }}//end calculos                              
                    });                    
                }});

        } catch (error) {
            console.log(error)
        }
    }else{
        res.redirect('/')
    }
}

//VISTA TAQUERO
exports.verordenes = (req, res)=>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM ordenes WHERE taquero =?', ['si'],(error, results) => {
            const ordenes = results;
            //console.log(productos)
        if(error){
            console.log('ocurrio un error', error) 
        }
        else{
            res.render('vistataquero', {ordenes})
        }
        })    
        }else{
            res.redirect('/')
        }
    }

//CORTE CAJERO
exports.corte = async (req, res)=>{
    if(req.cookies.jwt){
        try{
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
                );
            const usuario = decoded.usuario
                var a = (parseInt(req.body.veinte) * 20)
                var b = (parseInt(req.body.cincuenta) * 50)
                var c = (parseInt(req.body.cien) * 100)
                var d = (parseInt(req.body.doscientos) * 200)
                var e = (parseInt(req.body.quinientos) * 500)
                var f = parseInt(req.body.monedas)
                var mn = a + b + c + d + e + f
                var g = parseInt(req.body.und)
                var h = (parseInt(req.body.cincod) * 5)
                var i = (parseInt(req.body.diezd) * 10)
                var j = (parseInt(req.body.veinted) * 20)
                var k = (parseInt(req.body.cincuentad) * 50)
                var l = (parseInt(req.body.ciend) * 100)
                var dll = g + h + i + j + k + l
                //let tc =0;
                db.query('SELECT * FROM TipoCambio ORDER BY id DESC LIMIT 1',(error, result) =>{
                    if(error){
                        console.log(error);
                    }else{
                        let tc = result[0].tc;
                        //console.log('Tipo de cambio: ', tc)
                        var dolar = dll * tc
                        //console.log('dolar: ',dolar)
                        var total = mn + dolar
                        //console.log('Total: ', total)
                        var date = Date();
                        var fecha = date.slice(0, 15);
                        db.query('INSERT INTO cortecajero SET ?',{usuario:usuario, fecha:fecha, mn:mn, dll:dll,totalef:total })
                                db.query('SELECT * FROM arqueo WHERE usuario =?', [usuario],(error, results) =>{
                                    if(error){console.log(error)}
                                    else{
                                        //console.log('Debe tener: ',results);
                                        var rmn = mn - parseFloat(results[0].mn);
                                        //console.log('Resultado mn: ',rmn);
                                        var rdll = dll - parseFloat(results[0].dll);
                                        //console.log('Resultado dolar: ',rdll);
                                        var efec = parseFloat(results[0].totalvtas) - parseFloat(results[0].tarjeta);
                                        var totalf = total - efec;
                                        totalf = totalf.toFixed(2)
                                        //console.log('Resultado total: ',totalf);
                                        db.query('UPDATE cortecajero SET res =? WHERE usuario =?',[totalf,usuario])
                                        //db.query('UPDATE arqueo SET mn =?, dll =?, tarjeta =?, totalvtas =? WHERE usuario=?',[0,0,0,0, usuario])
                                        db.query('DELETE FROM arqueo WHERE usuario=?',[usuario]);
                                        if(totalf >= 0){
                                            //console.log('Tu sobrante es:', totalf)
                                            return res.render('rescorte',{usuario:usuario,resultado:'sobrante',totalf:totalf})
                                        }
                                        else{
                                            //console.log('Tu faltante es: ',totalf)
                                            return res.render('rescorte',{usuario:usuario,resultado:'faltante',totalf:totalf})
                                        }
                                    }
                                })
                    }})
        }catch(error){
            console.log(error)
        }
    }
}
//CIERRE DE TIENDA
exports.cierretienda = (req,res)=>{
    if(req.cookies.jwt){
        db.query('SELECT * FROM usuarios WHERE puesto !=?',['Gerente'],(error,result)=>{
            let us = []
            for (let i = 0; i < result.length; i++) {
                if(result[i].estatus == 'activo'){
                    us.push(result[i].nombre)
            }}
            if(us.length > 0 ){
                var a =us
                return res.render('cierretienda', {message: 'Aun hay empleados en el sistema', accion:'danger',user:a,no:'no'})
            }
        })
        db.query('SELECT * FROM arqueo',(error, result)=>{
            if(error){console.log(error)}
            else{
                if(result.length > 0){
                    return res.render('cierretienda', {message: 'Faltan empleados por realizar su corte', accion:'danger',no:'no'})
                }
            }
        })
        db.query('SELECT * FROM ordenes',(error, results)=>{
            if(error){console.log(error)}
            else{
                db.query('SELECT * FROM comandas',(error,result)=>{
                    if(error){console.log(error)}
                    else{
                        if(results.length > 0 || result.length > 0){
                            return res.render('cierretienda', {message: 'Aun quedan comandas por cobrar', accion:'danger',no:'no'})
                        }else{
                            db.query('SELECT * FROM reporteventas',(error, results)=>{
                                if(error){console.log(error)}
                                else{
                                    var total =0;
                                    for (let i = 0; i < results.length; i++) {
                                        total = total + parseFloat(results[i].total);
                                    }
                                    var date = Date()
                                    var fecha = date.slice(0, 15);
                                    db.query('DELETE FROM reporteventas');
                                    db.query('INSERT INTO reportegeneral SET ?',{fecha:fecha, ventastotales:total })
                                    return res.render('cierretienda', {message: 'Cierre realizado correctamente', accion:'success',si:'ventas'})
                                }
                            })
                        }
                    }
                })
            }
        })
        
    }else{
        res.redirect('/')
    }
}

//LOGOUT
exports.logout = async (req, res) =>{
    const decoded = await promisify(jwt.verify)(req.cookies.jwt,
        process.env.JWT_SECRET
        );
        console.log(decoded)
        db.query('UPDATE usuarios SET estatus =? WHERE usuario=?',['inactivo',decoded.usuario])

    res.cookie('jwt','logout',{
        expires: new Date(Date.now() + 2 *1000),
        httpOnly: true
    });  
    //rewrite actual cookie
    res.status(200).redirect('/')
}