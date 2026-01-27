const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Default to 500
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: message,
        data: null
    });
};

module.exports = errorHandler;
