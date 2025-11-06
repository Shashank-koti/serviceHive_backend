const mongoose = require("mongoose");

const swapRequestSchema = mongoose.Schema({
    requester :{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref : 'User'
    },
    recipient :{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref: "User"
    },
    requesterSlot :{
        type: mongoose.Schema.Types.ObjectId,
        required : true,
        ref: "Event"
    },
    recipientSlot :{
        type: mongoose.Schema.Types.ObjectId,
        required : true,
        ref: "Event"
    },
    status: {
    type: String,
    required: true,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING',
  },
});

const swapRequest = mongoose.model("swapRequest", swapRequestSchema);
module.exports = swapRequest;