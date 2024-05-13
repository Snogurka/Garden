/********** v.8.0.0 **********/

//////////////////////////////////////////////////////////////////////
//this function is the response on a click on the container class div
function containerClick(tgt) {
  //a click on the close helper-button, top of the screen; closes help-text
  if (tgt.classList.contains('btnClose')) {
    let hdr = document.querySelectorAll('header p');
    tgt.innerText === "\xD7" ?
    hdr.forEach(x => {x.style.display = "none"; tgt.innerText = "-";}) :
    hdr.forEach(x => {x.style.display = "block"; tgt.innerText = "\xD7";})
  }
  //a click on the show/hide archive articles
  else if (tgt.classList.contains('btnArchive')) {
    let archives = document.querySelectorAll('.archive');
    tgt.innerText === "More" ? archives.forEach(x => {x.style.display="block"; tgt.innerText = "Hide Archives";}) : archives.forEach(x => {x.style.display="none"; tgt.innerText = "More";});
  }
}

/***********************************************************************************
 * The following code creates seasonal animation: winter snow, spring flower, summer
 * rain(?), autumn leaf fall. The animation is triggered by a timeout, 10 seconds
 * after the page is loaded.
************************************************************************************/

// SET BACK TO 10000
window.setTimeout(callSeasons, 1000);
// window.setTimeout(addFlower = setInterval, 1000, spring, 300);

//variables to keep track of number of flowers;
//the max is a random number betweem 50 and 70;
var times = 0, maxTimes = 5 + Math.floor(Math.random()*10)*2, timer = null;
// window.onscroll = function() {spring();}

function callSeasons() {
  let today = new Date();
  switch (today.getMonth()+1) {
      //winter
    case 1:
    case 2:
    case 12:
      winter();
      break;
    case 3:
    case 4:
    case 5:
      //spring
      timer = setInterval(spring, 1000);
      break;
    case 6:
    case 7:
    case 8:
      //summer
      break;
    case 9:
    case 10:
    case 11:
      //fall
      break;
    default:
      //do nothing or something year around, like birds and bugs flying by
  }
}

function mySnowFall() {
  let snowFlake = document.createElement("div");
  snowFlake.className = "snowflake";
  document.body.appendChild(snowFlake);
  snowFlake.style.top = "50px";
  snowFlake.style.right = "300px";
}


////////////////////////////////////////////////////////////////////////////////
//
var makeSnow = null;
function winter() {
  //add filter to photos
//   -webkit-filter: grayscale(100%); /* Safari 6.0 - 9.0 */
//   filter: grayscale(100%);

  startSnowFall();
  //snow for 5-10 minutes, then pause for 5-10 minutes and resume
  setInterval(snowSwitch, 100000);
  function snowSwitch() {
    if (makeSnow) {
      let canvas = document.getElementById("canvas");
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      clearInterval(makeSnow);
      makeSnow = null;
    } else {
      startSnowFall();
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
//
function startSnowFall() {

  // code is from
  // http://thecodeplayer.com/walkthrough/html5-canvas-snow-effect

  // get a reference to the canvas element
  let canvas = document.getElementById("canvas");
  // get the context, onto which the drawing is rendered
	let ctx = canvas.getContext("2d");
  //exit, if the canvas is not supported (for very old versions of browsers)
  if (!ctx) return;

	//canvas dimensions to snow within space between margins only
// 	var W = document.getElementsByClassName("leftSide")[0].getBoundingClientRect().width;
  const W = window.window.screen.width;
  const H = window.window.screen.height;
	canvas.width = W;
	canvas.height = H;

	//snowflake particles
	const mp = parseInt(Math.random()*100); //max particles, up to 100
	let particles = [];
	for (let i = 0; i < mp; i++) {
		particles.push({
			x: Math.random()*W, //x-coordinate
			y: Math.random()*H, //y-coordinate
			r: Math.random()*3+1, //radius
			d: Math.random()*mp //density
		})
	}

	//drawing snowflakes
	function draw() {
    let grad = ctx.createLinearGradient(0, 0, 10, 10);
    grad.addColorStop(0, "white");
    grad.addColorStop(0.5, "lightblue");
    grad.addColorStop(1, "white");
    ctx.strokeStyle = grad;

   //clear the canvas
		ctx.clearRect(0, 0, W, H);
		ctx.beginPath();

    //create the snowflakes
    for(let i = 0; i < mp; i++) {
			const p = particles[i];
      // size adjuster, a decimal from 0 to 1 to create variety in snoflake size
      const sz = Math.random();
      ctx.moveTo(p.x+1.5,p.y+1.5);
      ctx.lineTo(p.x+8.5,p.y+8.5)*sz;
      ctx.moveTo(p.x+5, p.y);
      ctx.lineTo(p.x+5,p.y+10)*sz;
      ctx.moveTo(p.x+8.5,p.y+1.5);
      ctx.lineTo(p.x+1.5,p.y+8.5)*sz;
      ctx.moveTo(p.x,p.y+5);
      ctx.lineTo(p.x+10,p.y+5)*sz;
      ctx.lineWidth = 0.1;
      ctx.stroke();
		}
		update();
	}

	//Function to move the snowflakes angle is an ongoing incremental flag. Sin and Cos functions are applied to it to create vertical and horizontal movements of the flakes
	let angle = 0;
	function update()
	{
		angle += 0.01;
		for(var i = 0; i < mp; i++)
		{
			var p = particles[i];
			//Updating X and Y coordinates
			//add 1 to the cos function to prevent negative values which will lead flakes to move upwards
			//Every particle has its own density which can be used to make the downward movement different for each flake
			//make it more random by adding in the radius
			p.y += Math.cos(angle+p.d) + 1 + p.r/2;
			p.x += Math.sin(angle) * 2;

			//Sending flakes back from the top when it exits
			//Lets make it a bit more organic and let flakes enter from the left and right also.
			if(p.x > W+5 || p.x < -5 || p.y > H)
			{
				if(i%3 > 0) //66.67% of the flakes
				{
					particles[i] = {x: Math.random()*W, y: -10, r: p.r, d: p.d};
				}
				else
				{
					//If the flake is exitting from the right
					if(Math.sin(angle) > 0)
					{
						//Enter from the left
						particles[i] = {x: -5, y: Math.random()*H, r: p.r, d: p.d};
					}
					else
					{
						//Enter from the right
						particles[i] = {x: W+5, y: Math.random()*H, r: p.r, d: p.d};
					}
				}
			}
		}
	}

	//animation loop
	makeSnow = window.setInterval(draw,35);
}


////////////////////////////////////////////////////////////////////////////////
//creates and appends flower divs to the left and right margins of the page
function spring() {
  times++;
  if (times > maxTimes) {
    clearInterval(timer);
  }

  //create a div that will represent a dogwood flower
  let flower = document.createElement("div");
  flower.classList.add("flower");
  flower.classList.add("flower1");

  //set random top and left flower position, within the left and right "margins"

  //limit the top offset to the the range betwen upper 25th and third of the screen,
  //so that the flowers are on the upper branches
  let randH = 0;
  if (times%3 === 0) {
    randH = window.screen.height/1.7 + Math.floor(Math.random()*window.screen.height/5);
  } else {
    randH = window.screen.height/25 + Math.floor(Math.random()*window.screen.height/4);
  }

  //the random width is limited to the center of the margin width; the margin
  //width is set in the home.css file to: 50 for screen over 768px and 30 for
  //under; furthermore, if the vertical placement, randH, is inside the 3rd
  //or 9th 9ths of the screen height, i.e. is at the branches's bases put the
  //flowers closer to the trunk, by limiting the width
  let randW = Math.floor(
    Math.random() *
  //can get the margins one of the two ways below
    (parseInt(window.getComputedStyle(document.getElementsByClassName("container")[0]).marginLeft)/2 ||
     parseInt(window.getComputedStyle(document.getElementsByClassName("container")[0]).currentStyle.marginLeft)/2)
    //or
//     (window.screen.width - document.getElementsByClassName("container")[0].getBoundingClientRect().width)/4
  );
  flower.style.top = randH + "px";
  flower.style.left = randW + "px";

  //append the flower randomly to the left or right sides, onto the "margins";
  //the logic here, if a random number is divisable by 2, place the flower on the left...
  if (Math.floor(Math.random()*Math.floor(2))%2===0) {
    document.getElementsByClassName("leftSide")[0].appendChild(flower);
  }
  else {
    document.getElementsByClassName("rightSide")[0].appendChild(flower);
  }
}
