import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: String,
});

userSchema.pre('save', async function (next) {
    console.log(typeof next);
    try {
        next();
    } catch(err) {
        console.error("Hook Error:", err.message);
    }
});

const User = mongoose.model('TestUser', userSchema);

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/test_msms');
    try {
        const u = await User.create({ username: 'test' });
        console.log("Created");
    } catch (e) {
        console.error("Main Error:", e.message);
    }
    await mongoose.disconnect();
}

run();
