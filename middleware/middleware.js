const User = require("../models/user");
const jwtToken = require("jsonwebtoken");

const protect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ){
    try {
      let token = await req.headers.authorization.split(" ")[1];
      const decoded = jwtToken.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(402).json({ message: "Not authorized, no token" });
  }
};

module.exports = protect;