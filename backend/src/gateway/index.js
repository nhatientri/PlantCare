const { Server } = require("socket.io");

let io;

const initGateway = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for dev simplicity
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("New Client Connected:", socket.id);

        socket.on("disconnect", () => {
            console.log("Client Disconnected:", socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper to broadcast updates
const broadcastDeviceUpdate = (deviceId, data) => {
    if (io) {
        io.emit("device_update", { deviceId, data });
    }
};

module.exports = {
    initGateway,
    getIO,
    broadcastDeviceUpdate
};
