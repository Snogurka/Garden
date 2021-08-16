/********** v.7.1 **********/
/* Changes:
  -- photos on mobile: limit the width to the 80% of the screen max
  -- flower positioning
*/
 
//////////////////////////////////////////////////////////////////////
//response to clicking on the "More" button located on the home page
//the function shows archived photos, one at a time
function showArchive(btn) {
  let pars = document.getElementsByClassName("archive");
  for (let i = 0, l = pars.length; i < l; i++) {
    if (btn.innerText === "Hide Archives") {
      pars[i].style.display = "none";
      if(i === l-1){btn.innerText.toUpperCase() = "MORE"};
    }
    else if (pars[i].style.display != "block") {
      pars[i].style.display = "block";
      if(i === l-1){btn.innerText = "Hide Archives"};
      break;
    }
  }
}

//////////////////////////////////////////////////////////////////////
//display the photo gallery
function openGallery(tgt) {
  let picGallery = document.getElementById("picGal");
  if (picGallery.style.display === "block" && picGallery.children[0].src === tgt.src) {
    picGallery.style.display = "";
  } else {
    picGallery.style.display = "block";
  }
  picGallery.children[0].src = tgt.src;
}

//////////////////////////////////////////////////////////////////////
//this function is the responce on a click on the container class div
function containerClick(tgt) {
  
  if (tgt.type === "submit") {
    showArchive(tgt);
    return;
  }
  
  if (tgt.tagName === "IMG") {
    openGallery(tgt);
  } else if (tgt.id === "picGal") {
    openGallery(tgt.children[0]);
  }
}

//variables to keep track of number of flowers;
//the max is a random number betweem 50 and 70;
var times = 0, maxTimes = 5 + Math.floor(Math.random()*10)*2, timer = null;

// window.onscroll = function() {
//   spring();
// }

window.setTimeout(callSeasons, 3000);
// window.setTimeout(addFlower = setInterval, 1000, spring, 300);

function callSeasons() {
  let today = new Date();
  switch (today.getMonth()) {
    case 0, 1, 11:
      //winter
      console.log("it's winter");
      break;
    case 2, 3, 4:
      //spring
      console.log("it's spring");
      timer = setInterval(spring, 300);
      break;
    case 5, 6, 7:
      //summer
      console.log("it's summer");
      break;
    case 8, 9, 10:
      //fall
      console.log("it's fall");
      timer = setInterval(spring, 300);
      break;
    default:
      //do nothing or something year around, like birds and bugs flying by
  }
}

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
