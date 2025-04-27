import { Button, TextField } from "@mui/material";
import React from "react";

function Join({ onClick, joinRoomId, setJoinRoomId }) {
  return (
    <form
      className="min-w-[500px]"
      onSubmit={(e) => {
        onClick();
        e.preventDefault();
      }}
    >
      <TextField
        id="outlined-basic"
        label="Room ID"
        variant="outlined"
        className="w-full"
        value={joinRoomId}
        onChange={(e) => {
          setJoinRoomId(e.target.value);
        }}
      />
      <br />
      <br />
      <Button
        variant="contained"
        color="success"
        style={{ width: "100%" }}
        onClick={() => {
          onClick();
        }}
      >
        Join Room
      </Button>
    </form>
  );
}

export default Join;
