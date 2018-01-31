/**
* text.js
* 
* This file contains text instructions needed to play the game
*/



// get a new canvas to write instuctions on
var canvas = document.getElementById("myCanvas");
var ctx=canvas.getContext("2d");

// set the font
ctx.font="30px Times New Roman";
// set the color
ctx.fillStyle = "hotpink";
// set the text location to be center
ctx.textAlign = "center";
ctx.fillText("Instructions", canvas.width/2, 40);

ctx.font="16px Times New Roman";
ctx.fillStyle = "black";
ctx.textAlign = "start";
ctx.fillText("* Left(A) / Right(D) arrow", 10, 70);
ctx.fillText("-> Roll left/ right", 30, 90);
ctx.fillText("* Up(W) / Down(S) arrow", 10, 110);
ctx.fillText("-> Pitch up/ down", 30, 130);
ctx.fillText("* (+) / (-) sign", 10, 150);
ctx.fillText("-> Speed up/ down", 30, 170);
