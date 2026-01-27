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
// Throttle updates per device to max 1 per second
const lastBroadcast = {};

const broadcastDeviceUpdate = (deviceId, data) => {
    if (io) {
        const now = Date.now();
        const last = lastBroadcast[deviceId] || 0;

        // Always pass through if urgency is needed (e.g. online status change), 
        // but for general status updates, throttle.
        // Actually, let's throttle everything to 500ms to be safe, 
        // unless it's a critical state change if we could detect it.
        // For now, strict 500ms throttle is safer for frontend performance.

        if (now - last > 100) {
            io.emit("device_update", { deviceId, data });
            lastBroadcast[deviceId] = now;
        }
    }
};

module.exports = {
    initGateway,
    getIO,
    broadcastDeviceUpdate
};
