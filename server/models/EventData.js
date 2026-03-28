const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    goal: {
      type: Number,
      required: true,
      min: 1,
    },
    days: {
      type: [Boolean],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const eventDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    events: {
      type: [eventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

eventDataSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("EventData", eventDataSchema);
