const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const protect = require("./middleware/middleware");
const Event = require("./models/event");
const SwapRequest = require("./models/swapRequest");

const app = express();
dotenv.config();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://shashankkoti05_db_user:pBW8f2OX0tCauRDc@servicehive.hqs0tie.mongodb.net/?appName=serviceHive")
  .then(() => console.log("DB connected"))
  .catch(err => console.error("DB connection error:", err));

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });
    if (user) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.use(protect);

app.post("/api/events",async(req,res)=>{
  try{
    const {title, startTime, endTime, status}  = req.body;
    const event = new Event({
      title,
      startTime,
      endTime,
      status: status || "BUSY",
      owner : req.user._id,
    });
    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  }catch(error){
    res.status(500).json({ message: `Error creating event: ${error.message}` });
  }
})


app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find({ owner: req.user._id }).sort({ startTime: "asc" });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: `Error fetching events: ${error.message}` });
  }
})

app.put("/api/events/:id",async(req,res)=>{
  try{
    const {title, startTime,endTime,status} = req.body;
    const event = await Event.findById(req.params.id);

    if (event.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User cannot right to update' });
    }

    event.title = title || event.title,
    event.startTime = startTime || event.startTime,
    event.endTime = endTime || event.endTime,
    event.status = status || event.status
    
    const updatedEvent = await event.save();
    res.json(updatedEvent);
  }catch (error) {
    res.status(500).json({ message: `Error in updating event: ${error.message}` });
  }
})

app.delete("/api/events/:id",async(req,res)=>{
  try {
    const {id} = req.params.id;
    const deletedEvent = await Event.findByIdAndDelete(id);
    res.json({ message: `event deleted ${deletedEvent}`});
  } catch (error) {
    res.status(500).json({ message: `Error deleting event: ${error.message}` });
  }
});

app.get("/api/swap/swappable-slots", async(req,res)=>{
  try {
    const slots = await Event.find({
      status : "SWAPPABLE",
      owner : {$ne : req.user._id}
    }).populate('owner', 'name email');
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message:` ${error.message}`});
  }
});

app.post("/api/swap/request", async(req,res)=>{
  try {
    const { mySlotId, theirSlotId} = req.body;
    const requesterId = req.user._id;

    const mySlot = await Event.findById(mySlotId);
    const theirSlot = await Event.findById(theirSlotId);

    if (!mySlot || !theirSlot) {
      return res.status(404).json({ message: 'One or both slots not found' });
    }
    if (mySlot.owner.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: 'You do not own the slot you are offering' });
    }
    if (theirSlot.owner.toString() === requesterId.toString()) {
      return res.status(400).json({ message: 'You cannot swap a slot with yourself' });
    }
    if (mySlot.status !== 'SWAPPABLE' || theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ message: 'One or both slots are not marked as swappable' });
    }

    mySlot.status = "SWAP_PENDING";
    theirSlot.status = "SWAP_PENDING";
    await mySlot.save();
    await theirSlot.save();

    const swapRequest = await SwapRequest.create({
      requester : requesterId,
      recipient : theirSlot.owner,
      requesterSlot : mySlot,
      recipientSlot : theirSlot,
      status : "PENDING"
    });

    res.json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: `Error creating swap request: ${error.message}` });
  }
});

app.post("/api/swap/response/:id", async (req, res) => {
  try {
    const { accepted } = req.body;
    const swapRequestId = req.params.id;
    const recipientId = req.user._id;

    const swapRequest = await SwapRequest.findById(swapRequestId);

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found' });
    }
    if (swapRequest.recipient.toString() !== recipientId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to respond to this request' });
    }
    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ message: 'This request has already been actioned' });
    }

    const requesterSlot = await Event.findById(swapRequest.requesterSlot);
    const recipientSlot = await Event.findById(swapRequest.recipientSlot);

    if (!requesterSlot || !recipientSlot) {
      return res.status(404).json({ message: 'One of the events in this swap no longer exists' });
    }

    if (accepted === true) {
      requesterSlot.owner = recipientId;
      recipientSlot.owner = swapRequest.requester; 

      requesterSlot.status = "BUSY";
      recipientSlot.status = "BUSY";

      swapRequest.status = "ACCEPTED";

      await recipientSlot.save();
      await requesterSlot.save();
      await swapRequest.save();
      res.json({ message: 'Swap accepted and completed successfully' });
    } else {
      requesterSlot.status = "SWAPPABLE"; 
      recipientSlot.status = "SWAPPABLE";

      swapRequest.status = "REJECTED";

      await requesterSlot.save();
      await recipientSlot.save();
      await swapRequest.save();
      
      res.json({ message: 'Swap rejected' }); 
    }
  } catch (error) {
    res.status(500).json({ message: `Error responding to swap request: ${error.message}` });
  }
})


app.get("/api/swap/requests/incoming", async(req,res)=>{
  try {
    const requests = await SwapRequest.find({
      recipient : req.user._id,
      status : "PENDING"
    }).populate("requester", 'name')
      .populate('requesterSlot')
      .populate('recipientSlot');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: `Error fetching incoming requests: ${error.message}` });
  }
});

app.get("/api/swap/requests/outgoing", async(req,res)=>{
  try {
    const requests = await SwapRequest.find({
      requester: req.user._id
    }).populate('recipient', 'name')
      .populate('requesterSlot')
      .populate('recipientSlot')

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: `Error fetching outgoing requests: ${error.message}` });
  }
})

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
