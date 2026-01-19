// Simple in-memory store for pending commands
const commands = {};

module.exports = {
    get: (deviceId) => {
        const cmd = commands[deviceId];
        delete commands[deviceId]; // Pop it
        return cmd || null;
    },
    set: (deviceId, command) => {
        commands[deviceId] = command;
    }
};
