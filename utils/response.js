exports.success = (res, data = {}, message = "Operación exitosa") => {
    res.status(200).json({status: true, message, ...data});
};

exports.error = (res, message = "Error interno", code = 400) => {
    res.status(code).json({status: false, message});
};
