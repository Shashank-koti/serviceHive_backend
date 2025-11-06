const mongoose = require("mongoose");

const eventSchema = mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    startTime:{
        type:Date,
        required:true
    },
    endTime:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        required:true,
        enum:['BUSY', 'SWAPPABLE', 'SWAP_PENDING'],
        default:"BUSY",
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
});

const event = mongoose.model("Event", eventSchema);
module.exports = event;