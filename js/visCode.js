/********** v.7.4.1 **********/

/*  changes:

  *** DONE ***
  - added functionality to display instructions for when the page is first loaded and there is no design  
  - limited plant name length to 15 characters
  - changed size var to 6
  - garden toolbox: add all plants to garden
  - when adding a plant from garden's settings, the plant needs to be added to that garden
  - when adding a plant or a garden, make sure it doesn't go beyond boundaries
  - fix toggle all photos - availability can't be based on first plant
  
  *** ToDo ***  
  
  - change the trigger of delete to an x-button, instead of double click  
  
  - add photo gallery functionality (share with db and home)

  - keep working on filters: shade should not be picked up in part-shade, etc.
  
  - add color all plant names, using the first color available, dark green for default
  - add season simulation: pick a month -> color what's in bloom

- add alphabet or plant type to the right of add p/g menu for speed (same on db?)
  - switching between inches and cm needs more for to handle plants
  - add multicolor flowering support, maybe using gradients 

  - maybe change the delete to be triggered by a trashcan button, next to size for the plant and in settings for the garden instead of double click
  toolbox:
    - round vs rect garden shape?
    - garden zooming in/out
*/


/**********************************************************************************
   Important: 
   Ids are created for each plant's and garden's groups and are prefixed 
   with p_ for plants, with g_ for gardens;
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
var xmlns = "http://www.w3.org/2000/svg";
var svgPlace = null;
var size = 6; //the size of the svg view and port, now only used for the size of the garden rect
//sizing ratio is set to 1" = 10px (1' = 120px)
////////////////////////////////////////////////////////////////////////////////////////////////////////
//      moving and resizing
////////////////////////////////////////////////////////////////////////////////////////////////////////
var clickedGroup = null;
var coord = null; //coordinate of touch/click adjusted by CTM
var offset = null; //coord adjusted by transform/translate
var transform = null; //item 0 (set to translate) of clickedGroup's transforms
var resize = false;   
var moving = false;
var clickPos = {}; //stores cursor location upon first click
var mobile = false;   //on the mobile devices, both touch and mouse up and down come through, thus ignore mouse on mobile
////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////
//this function is called on window load and loads existing garden design from user's local storage
function myMain(){
  
  svgPlace = document.getElementById("svgArea");
  svgPlace.setAttributeNS(null, "width", window.screen.width*2);
  svgPlace.setAttributeNS(null, "height", window.screen.height*2);
  svgPlace.viewBox.baseVal.x = 0;
  svgPlace.viewBox.baseVal.y = 0;  
  svgPlace.viewBox.baseVal.width = window.screen.width * 2;
  svgPlace.viewBox.baseVal.height = window.screen.height * 2;
  
  // munit = my unit, the font size, if set to 14, munit is ~7.11
  munit = Math.round((Number(window.getComputedStyle(svgPlace, null).getPropertyValue("font-size").replace("px",""))/1.9 + Number.EPSILON) * 100) / 100;
  
  //add linear gradients for each sun/soil combination, stored in an array
  let arrSunSoilCombo = ["Full_Acid", "Full_Neutral", "Full_Alk", 
                         "Part_Acid", "Part_Neutral", "Part_Alk", 
                         "Shade_Acid", "Shade_Neutral", "Shade_Alk"];
  let sunColors = {"Full":["#ffe922", "50%"], "Part":["#ddcc38", "30%"], "Shade":["#bfba71", "30%"]};
  let soilColors = {"Acidic":"rgb(160, 195, 68)", "Neutral":"rgb(166, 146, 62)", "Alkaline":"rgb(4, 56, 111)"};

  for (sun in sunColors) {
    for (soil in soilColors) {
      addLineGrad (sun + "_" + soil, [
        {offset:'0%', 'stop-color':sunColors[sun][0], "stop-opacity":"0.8"},
        {offset:sunColors[sun][1], 'stop-color':'#d1e0e0', "stop-opacity":"0.3"},
        {offset:'90%', 'stop-color':'#d1e0e0', "stop-opacity":"0.8"},
        {offset:'97%','stop-color':soilColors[soil], "stop-opacity":"0.8"}
      ]);
    }
  }
  //color the plant notes
  addLineGrad ("plant_notes", [
    {offset:'0%', 'stop-color':'grey', "stop-opacity":"0.9"},
    {offset:'97%','stop-color':'grey', "stop-opacity":"0.1"}
  ]);
  
  //check if localStorage is available and load the existing design, if there is one
  if(checkLocalStorage()){
    loadExistingDesign();
  }
}

//////////////////////////////////////////////////////////////////////
//create linear gradients for the gardens
function addLineGrad(id, stops) {
  let svgNS = svgPlace.namespaceURI;
  let grad  = document.createElementNS(svgNS,'linearGradient');
  grad.setAttributeNS(null, 'id', id);
  grad.setAttributeNS(null, 'x1', "50%");
  grad.setAttributeNS(null, 'y1', "0");
  grad.setAttributeNS(null, 'x2', "50%");
  grad.setAttributeNS(null, 'y2', "100%");
  for (let i=0; i < stops.length; i++){
    let attrs = stops[i];
    let stop = document.createElementNS(svgNS,'stop');
    for (let attr in attrs){
      if (attrs.hasOwnProperty(attr)) stop.setAttribute(attr,attrs[attr]);
    }
    grad.appendChild(stop);
  }
  let defs = svgPlace.querySelector('defs') ||
      svgPlace.insertBefore(document.createElementNS(svgNS,'defs'), svgPlace.firstChild);
  defs.appendChild(grad); 
}

//////////////////////////////////////////////////////////////////////
//check if local storage functionality is available to the user
function checkLocalStorage() {
  if (typeof(Storage) !== "undefined"){
    try {
      localStorage.getItem("aas_myGardenVs_warnings");
      return true;
    }
    catch(error){
      console.error(error);
      document.getElementsByTagName("P")[0].innerText = "This page can only be used when the Local Storage is supported and enabled by the browser. "
      + "The Local Storage is currently disabled on your machine. "
      + "Disable Local Storage restrictions at your own risk."
      document.getElementsByTagName("P")[0].style.color = "red";
      return false;
    }
  } else {
    console.log("checkLocalStorage(): got to the else clause of the if stmt with try clause");
    return false;
  }
}

//////////////////////////////////////////////////////////////////////
//pull previously designed gardens and plants and recreate them
function loadExistingDesign() {
  //  capture the number of gardens created
  let gardens =  localStorage.aas_myGardenVs_grdns;
  if (gardens){
    gardens = gardens.split(",");
    for (var i = 0, l = gardens.length; i < l; i++){
      //pull gardens counter from local storage
      let garden = localStorage.getItem("aas_myGardenVs_grdn"+gardens[i].toString());
      //recreate gardens based on the counter and stored garden id, x, y, w, h, tx, 
      //ty, nm (name), sn (sun)
      if (garden) {
        garden = garden.split(",");
        addGarden(
          {gId:gardens[i], 
           x:Number(garden[0]),
           y:Number(garden[1]),
           w:Number(garden[2]),
           h:Number(garden[3]),
           tx:Number(garden[4]),
           ty:Number(garden[5]),
           nm:garden[6].replaceAll(";;",","),
           sn:garden[7],
           sl:garden[8]
          });
      }
    }
  }
  // capture the number of plants created
  let plants = localStorage.aas_myGardenVs_plnts;
  if (plants){
    plants = plants.split(",");
    for (var i = 0, l = plants.length; i < l; i++){
      let plant = localStorage.getItem("aas_myGardenVs_plnt"+plants[i]);
      if (plant) {
        plant = plant.split(",");
        //recreate each plant by supplying pId (plant id), x, y, w (width), h (height), tx (translate x), 
        //ty, nm (name), gId (group id), lnm (latin name), img (bln image showing), clr (color)
        addPlant({
          pId:plants[i], 
          x:Number(plant[0]),
          y:Number(plant[1]),
          w:Number(plant[2]),
          h:Number(plant[3]),
          tx:Number(plant[4]),
          ty:Number(plant[5]),
          nm:plant[6], 
          gId:plant[7], 
          lnm:plant[8],
          img:plant[9], 
          clr:plant[10]
        });
      }
    }
  }
  
  if (!gardens && !plants) {
    let initText = document.createElement("div");
    initText.id = "initText";
    initText.textContent = "Welcome to the Garden Design page. "+
     "To add or delete a plant or a garden, double click anywhere in the blue area. "+
      "Double clicking individual garden or plant deletes that garden or plant. "+
      "Once a garden is added, you can change its name and resize it. From garden's "+
      "settings, you can pull plants based on garden name, sun and soil, compatibility. "+
      "Note, your personal garden design will be saved on your computer. "+
      "To use this page, your browser must support and allow local storage. "+
      "Disable local storage restrictions at your own risk.".toUpperCase()
    let closeButton = document.createElement("button");
    closeButton.textContent = "x";
    closeButton.classList.add("btnClose");
    closeButton.addEventListener("click", function(evt) {
      document.body.removeChild(evt.target.parentElement);
    });
    initText.appendChild(closeButton);
    document.body.appendChild(initText);
  }
}

  
//////////////////////////////////////////////////////////////////////
//settings menu drop down, called by clicking on settings button
function settingsMenu(clkdElt) {

  if (clkdElt.className === "fa fa-fw fa-cog") {
    clkdElt = clkdElt.parentElement;
  }
  else if (clkdElt.className === "customChoice") {
    switch (clkdElt.innerText) {
      case "Warnings\xa0On":    
        localStorage.setItem("aas_myGardenVs_warnings", 1);
        clkdElt.innerText = "Warnings\xa0Off";
        return;
			case "Warnings\xa0Off":
        localStorage.setItem("aas_myGardenVs_warnings", 0);
        clkdElt.innerText = "Warnings\xa0On";
        return;
      case "Units: in":
        localStorage.setItem("aas_myGardenVs_units", 1);
        clkdElt.innerText = "Units: cm";
        toggleCmIn("cm");
        return;
      case "Units: cm":
        localStorage.setItem("aas_myGardenVs_units", 0);
        clkdElt.innerText = "Units: in";
        toggleCmIn("in");
        return;
      default:
        //respond to season changing, todo: future code
        alert("this is yet to come");
        console.log("season change requested");
//         clkdElt = clkdElt.parentElement;
        return;   
                             }	
  }
  
  //if the button already has a dropdown menu it has 
  //more than one child (icon), remove the menu
  if (clkdElt.childElementCount > 1) {
    clkdElt.removeChild(clkdElt.children[1]);
  }
  //else, create the settings menu
  else {
    let warningsSetting = localStorage.getItem("aas_myGardenVs_warnings");
    Number(warningsSetting)?warningsSetting="Warnings\xa0Off":warningsSetting="Warnings\xa0On";
    //Units: 0 - inches/feet; 1 - cm/m;
    let unitSetting = localStorage.getItem("aas_myGardenVs_units");
    Number(unitSetting)?unitSetting="cm":unitSetting="in"
    clkdElt.appendChild(
      getUL (
        {values:["Seasons", warningsSetting, "Units: "+unitSetting],
         //the below are x and y positions of the clicked settings buttom
         xPos: (clkdElt.clientWidth+5).toString()+"px", 
         yPos: (clkdElt.clientHeight-25).toString()+"px"})
    );
  }
}


//////////////////////////////////////////////////////////////////////
//extract avg height and width, inches to pixels ratio 1:1
function getAvgNum(origVal) {
  //map performs an action on each element of an array, 
  //reduce operates on all the elements
  let inchVal = origVal.match(/\d+(''|")/g);
  //RegEx: to get feet: digit followed by quote that's not followed by anouther quote
  let footVal = origVal.match(/\d+'(?!')/g);
  let finalExtracted = [0];
  if (inchVal && footVal){finalExtracted = inchVal.map(x=>parseFloat(x)).concat(footVal.map(x=>parseFloat(x)*12));} 
  else if (inchVal) {finalExtracted = inchVal.map(x=>parseFloat(x));}
  else if (footVal) {finalExtracted = footVal.map(x=>parseFloat(x)*12);}
  finalExtracted = finalExtracted.reduce((a,b)=>(a+b))/finalExtracted.length.toString();
// 	finalExtracted === 0?finalExtracted=1:finalExtracted; //todo: how to deal with plants without width and height?
	return finalExtracted;
}

//////////////////////////////////////////////////////////////////////
//this function returns UL drop down menu with the values either  
//supplied in the menu parameter or pulled from plants json file
function getUL(menu) {
	//the menu parameter has: xPos, yPos, type, [gId], [values]
  hideDropDown();
  
  let dropMenu = document.createElement("ul");
  dropMenu.className = "dropDown";
  
  //if menu values are supplied, add them to the menu
  if (menu.values) {
    for (var i = 0, l = menu.values.length; i < l; i++){
      let liText = document.createElement("li");
      liText.className = "customChoice";
      liText.innerHTML = menu.values[i];
      dropMenu.appendChild(liText);
    }
  }
  
  //if menu values aren't supplied, retrieve the data from
  //the external plants.json file, shared with db tab & ls
  else {
    
    var xhr = null;
    if (window.XMLHttpRequest) {
      //code for modern browsers
      xhr = new XMLHttpRequest();
    } else {
      //code for old IE browsers
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {      // && xhr.status == 200)
        var myObj = JSON.parse(this.responseText);
        
        //if there are plants added by user in db, append those to the list of plants
        //if plant counter exists in local storage...
        let plantCounter = localStorage.getItem("aas_myGardenDb_rPlntsCntr");
        if (plantCounter) {
          for (let i = 0, len = plantCounter.length; i < len; i++) {
            arrPlntVals = JSON.parse(localStorage.getItem("aas_myGardenDb_plnt"+i))
            myObj[arrPlntVals[0]] = arrPlntVals.slice(1);
          }
        }
        //also remove the first entry in myObj, as it's has column headers and isn't needed
        delete myObj["Latin&nbspName"];
        
        //the returned plants are filtered, as requested
        if (menu.type === "companions") {
          menu.filter = (
              myObj[menu.forPlant][16].toLowerCase().split(",") + ", " +
              myObj[menu.forPlant][17].toLowerCase().split(",")).replace(/and |or /g, "");
        }
        if (menu.type === "gName") {
          let objInGarden = null; 
          if (localStorage.aas_myGardenDb_InGarden) {
            objInGarden = JSON.parse(localStorage.aas_myGardenDb_InGarden);
          }
          let newFilters = [];
          for (p in objInGarden) {
            if (objInGarden[p].toLowerCase().indexOf(menu.filter) > -1) {
              newFilters.push(p);
            }
          }
          menu.filter = newFilters;
        }
        
        if (menu.type != "all" && (menu.filter === ", " || !menu.filter.length)) {
          let liText = document.createElement("li");
          liText.textContent = "There are no recorded plants";
          dropMenu.appendChild(liText);
          liText = document.createElement("li");
          liText.textContent = "that match this criteria."
          dropMenu.appendChild(liText);
        } 
        else {
          if (menu.type != "all") {
            //add an option to add all filtered plants to the garden
            let liText = document.createElement("li");
            liText.className = "customChoice plant";
            liText.textContent = "Add All Plants";
            dropMenu.appendChild(liText);
          }
          //add filtered plant names to the menu
          for (x in myObj) {
            if (menu.type === "all" 
                //if a plant name (0) is in the list of plantFilters, add it as a companion plant
                || menu.type === "companions" && menu.filter.includes(myObj[x][0].toLowerCase())
                //if the month matches
                || menu.type === "timeToPlant" && myObj[x][21].toLowerCase().indexOf(menu.filter) > -1
                //if the name of current garden is local storage
                || menu.type === "gName" && menu.filter.includes(x)
                || menu.type === "sunSoil" 
                  && myObj[x][10].toLowerCase().indexOf(menu.filter[0]) > -1
                  && myObj[x][19].toLowerCase().indexOf(menu.filter[1]) > -1
               )
            {
              let liText = document.createElement("li");
              liText.className = "customChoice plant";
              //pulling common(2) and latin(1) names, class(3), height(4), width(5), sun(10), image(29)
              liText.title = myObj[x][3]+", likes "+myObj[x][10];
              liText.innerHTML = myObj[x][0];
              liText.setAttribute("data-lnm", x);
              //extract average height and width
              liText.setAttribute("data-avgh",getAvgNum(myObj[x][4]));
              liText.setAttribute("data-avgw",getAvgNum(myObj[x][5]));

              //check if image (29) is available, 0 - no image, 1 - image available and hidden
              //all images are in the same location and are named as pictures/CommonName.jpg;
              myObj[x][29] === "0"?liText.setAttribute("data-img", "0"):liText.setAttribute("data-img",1)
                 
              dropMenu.appendChild(liText);
            }
          }
        }
      } else if (this.status == 404) {//was xhr instead of this
      console.log("text file (source) not found");
      }
    }
    xhr.open("get", "plants.json", true);
    xhr.send();
  }
  
  dropMenu.style.left = menu.xPos;
  dropMenu.style.top = menu.yPos;
  return dropMenu;
}

function rangeCheck(x, min, max) {
  x = parseInt(x, 10);
  if (x >= min && x < max) {
    return true;
  } else {
    return false;
  }
}

//////////////////////////////////////////////////////////////////////
//call function to make a UL and add onclick functionality to each LI
function addPlantMenu(menu) {
  
  //call a function to create UL with plants at the position of a click
  let dropDownMenu = getUL(menu);
  
  //assign an onclick response to each plant, to add a plant to the left of the menu
  dropDownMenu.addEventListener("click", function(evt) {
    //make sure the click is on a custom choice, aka a choice in the menu
    if (evt.target.classList.contains("customChoice")) {
      //the 'Add All Plants' choice is only available in 3 menus from garden's settings
      if (evt.target.innerText === "Add All Plants") {
        //when adding all plants, group them by height vertically and space evenly horizontally; 
        let totl = evt.target.parentElement.childElementCount;
        let ar = Array.from(evt.target.parentElement.getElementsByTagName("li"));
        //divide garden's width by the total number of plants in each height group
        let xSp1 = menu.gW / (ar.filter(x=> rangeCheck(x.getAttributeNS(null, "data-avgh"),0,24)).length);
        let xSp2 = menu.gW / (ar.filter(x=> rangeCheck(x.getAttributeNS(null, "data-avgh"),24,48)).length);
        let xSp3 = menu.gW / (ar.filter(x=> rangeCheck(x.getAttributeNS(null, "data-avgh"),48,72)).length);
        let xSp4 = menu.gW / (ar.filter(x=> Number(x.getAttributeNS(null, "data-avgh"))>=72).length);
        
        //x-offset variables - one for each height group and one for current plant's offset
        let x1 = x2 = x3 = x4 = xOffset = 0;

        //loop through filtered plants and add them to the garden, from which the call was made
        for (let i = 1; i < totl; i++) { 
          //using garden height, gH, calculate the desired vertical spacing of plant groups
          //horizontally, plants are spaced at xOffset intervals
          let yOffset = menu.gH/3;
          if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 24) {
            yOffset *= 2.5;
            xOffset = x1 * xSp1;
            x1++;
          } else if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 48) {
            yOffset *= 2;
            xOffset = x2 * xSp2;
            x2++;
          } else if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 72) {
            yOffset *= 1.5;
            xOffset = x3 * xSp3;
            x3++;
          } else {
            xOffset = x4 * xSp4;
            x4++;
          }
          if(i%2) { yOffset += munit*1.5; }
          
          addPlant({
            pId:null,   //plant id
            x:menu.gX + xOffset,  //x pos
            y:menu.gY + yOffset,  //y pos
            w:Number(evt.target.parentElement.children[i].getAttribute("data-avgw")), //plant's width
            h:Number(evt.target.parentElement.children[i].getAttribute("data-avgh")), //plant's height
            tx:0, //x-transpose (0 , because gX includes transpose)
            ty:0, //y-transpose (0 , because gY includes transpose)
            nm:evt.target.parentElement.children[i].innerText, //plant's common name
            gId:menu.gId, //a garden id, where the new plant is planted, 0 at first
            lnm:evt.target.parentElement.children[i].getAttribute("data-lnm"), //plant's latin name
            img:(evt.target.parentElement.children[i].getAttribute("data-img")), //image file availability
            clr:0 //initially, the color value is a darker green which is set within addPlant() when this value is 0  
          });          
        }
      } 
      //if an individual plant was clicked, add it to the svg place (gId of 0)
      else {
        //if a plant is being added to a garden, center it within the garden
        //else, if it's a freestanding plant, place it to the left of menu, 
        //vertically at the y position of a click, which is near plant's name
        addPlant({
          pId:null, //plant id is set to null, when creating a new plant
          x: menu.gId?menu.gX + menu.gW/2:Number((parseFloat(evt.target.parentElement.style.left) 
                                                  - evt.target.textContent.length*munit).toFixed(2)),
          y: menu.gId?menu.gY + menu.gH/2:event.pageY,
          w:Number(evt.target.getAttribute("data-avgw")),
          h:Number(evt.target.getAttribute("data-avgh")),
          tx:0, //translate/transpose x
          ty:0, //translate/transpose y
          nm:evt.target.innerText, //plant's common name
          gId:menu.gId?menu.gId:0, //a garden id, where the new plant is planted, 0 at first
          lnm:evt.target.getAttribute("data-lnm"), //plant's latin name
          img:(evt.target.getAttribute("data-img")), //image file availability
          clr:0 //initially, the color value is a darker green which is set within addPlant() when this value is 0
          });
      }
    }
  });
  //the menu with event listeners have been created, now the menu can be added to the document, not svg
  document.body.appendChild(dropDownMenu);
}

//////////////////////////////////////////////////////////////////////
//this function is activated when a user selects a garden or
//plant from the 'add a garden or a plant' drop down menu;
function addGardenPlantUL() {
  
  let clkdElt = event.target;
  
  //if clicked on a garden option of dropdown menu
  if (clkdElt.innerText === "New\xa0Garden") {
//     fade(clkdElt);
    hideDropDown();
    addGarden( 
      {
        gId:null,
        x:parseFloat(event.target.parentElement.style.left),
        y:parseFloat(event.target.parentElement.style.top), 
        w:240,
        h:120,
        tx:0,
        ty:0,
        nm:"New Garden", 
        sn:"\uf185", //setting SUN value for a new garden to a sun icon
        sl:"Soil"
      }
    );
  } 
  
  //if clicked on a plant choice of dropdown menu
  else if (clkdElt.innerText === "New\xa0Plant") {
    addPlantMenu(
      {
        xPos: parseFloat(clkdElt.parentElement.style.left)+"px",
        yPos: parseFloat(clkdElt.parentElement.style.top)+"px",
        type: "all"
      }
    );
  } 
  
  //if clicked on a "Plant in MMM" choice of dropdown menu
  else if (clkdElt.innerText.slice(0,8) === "Plant\xa0in") {
    addPlantMenu(
      {
        xPos: parseFloat(clkdElt.parentElement.style.left)+"px",
        yPos: parseFloat(clkdElt.parentElement.style.top)+"px",
        type: "timeToPlant",
        filter: clkdElt.innerText.split("\xa0")[3].toLowerCase()
      }
    );
  } 
  
  //if a Delete All Plants or Delete All Gardens options are clicked
  else if (clkdElt.innerText.slice(0,6) === "Delete") {
    
    //confirm the removal of all plants or gardens
    if (localStorage.aas_myGardenVs_warnings && !(Number(localStorage.aas_myGardenVs_warnings)))
    {
      if (!confirm("Would you like to " + clkdElt.innerText + "?")){
        return;
      }
    }
    
    //capture plnts or grnds in a variable, based on a choice clicked
    let eltsToDelete = null;
    clkdElt.innerText[11]==="P"?eltsToDelete="plnts":eltsToDelete="grdns";
      
    //if gardens or plants exist and are stored, loop through their ls
    //counters and delete their entries from localStorage and from html
    if (localStorage.getItem("aas_myGardenVs_"+eltsToDelete)) {
      let counter = localStorage.getItem("aas_myGardenVs_"+eltsToDelete).split(",");
      for (i in counter) {
        del(svgPlace.getElementById(eltsToDelete[0] + "_" + counter[i]));
      }
      //remove the plant/garden counter from local storage
      localStorage.removeItem("aas_myGardenVs_"+eltsToDelete);
      hideDropDown();
    }
  }
}

//////////////////////////////////////////////////////////////////////
//this function toggles b/w cm and inches, triggered by settings menu
function toggleCmIn(units) {
  let vals = ['grdns']; //, 'plnts'];todo: not done, see below
  for (let x = 0, l = vals.length; x < l; x++) {
    if (localStorage.getItem("aas_myGardenVs_"+vals[x])) {
      let counter = localStorage.getItem("aas_myGardenVs_"+vals[x]).split(",");
      for (let i = 0, l = counter.length; i < l; i++) {
        //for each garden, update the size indicators to display in units chosen
        //the units in local storage and settings menu are updated before this is called
        let grp = svgPlace.getElementById(vals[x][0]+"_"+counter[i]);
        if (vals[x] === "grdns") {
          grp.getElementsByClassName("sizeInd")[0].textContent = 
            formatSizeDisplay(Number(grp.children[0].getAttributeNS(null, "height"))/size);
          grp.getElementsByClassName("sizeInd")[1].textContent = 
            formatSizeDisplay(Number(grp.children[0].getAttributeNS(null, "width"))/sizze);
        }
        //todo: not done - need to convert displayed size to inches before supplying it to format...
        else if (grp.getElementsByClassName("plantLook")) {
          let size = grp.getElementsByClassName("plantLook")[1];
          if (size)
            size.textContent = 
            "avg: " + 
//             formatSizeDisplay(Number(...)) + 
            " x " //+ 
//             formatSizeDisplay(Number(...));
        }
      }
    }
  }
}

//this function converts the supplied size value: if two arguments are supplied, 
//the returned result is one part (all cm or in); if one argument (all cm or in), 
//return two part size (m and cm or ft and in)
//the incoming size is always in inches
function formatSizeDisplay(x1, x2) {
  //x = units (metric 1 or not 0), x1 = higher group (m or feet), x2 = lower group (cm or in)
  let x = Number(localStorage.aas_myGardenVs_units);
  let ind1 = "", ind2 = "", denom = 1;
  //if metric, 
  //  the incoming size that's in inches needs to be converted to cm
  //  the denominator used for formatting is 100, otherwise 12
  //  the displayed format will show m & cm, otherwise ' and "
  if (x){
    x1 *= 2.54;
    denom = 100;
    ind1="m";
    ind2 = "cm";
  } 
  else {
    denom = 12;
    ind1="'";
    ind2 = '"';
  }
  
  //if a second argument is supplied, convert to small units and return one number
  if (x2){
    return parseInt(x1*denom+x2,10);
  }
  //if there are bigger units and a remainder, display bigger and smaller units
  else if ((parseInt(x1/denom,10)) && (parseInt(x1%denom,10))) {
    return parseInt(x1/denom,10)+ind1 + parseInt(x1%denom,10)+ind2;
  }
  //if a bigger unit is 0 and smaller is available (i.e. there is a remainder)
  else if (!(parseInt(x1/denom,10)) && (parseInt(x1%denom,10))) {
    return parseInt(x1%denom,10)+ind2;
  }
  //if there are bigger units and no smaller units
  else if ((parseInt(x1/denom,10)) && !(parseInt(x1%denom,10))) {
    return parseInt(x1/denom,10)+ind1;
  }
  //otherwise display 0 and smaller unit indicator
  else {
    return 0+ind2;
  }
//     let result = null;
//     x1%12?result=parseInt(x1/denom,10)+ind1+parseInt(x1%denom,10)+ind2:result=parseInt(x1/denom,10)+ind1;
//     return result;
}


//////////////////////////////////////////////////////////////////////
//this function pulls specific plant info using Latin Name stored in desc of a plant
function getPlantInfo(clkdElt, displayVal){  
  //get the plant's additional data
  var xhr = null; 
  if (window.XMLHttpRequest) {
    // code for modern browsers
    xhr = new XMLHttpRequest();
  } else {
    // code for old IE browsers
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {// && xhr.status == 200){
      
      //in myObj, the data is accessed using Latin Name as the key, stored in the desc field of each plant
      let myObj = JSON.parse(this.responseText);
      
      //Add COLOR CHOICES
      //if the plant has flowering colors options, capture them in an array, 
      //which is stored in the "desc" field of the plant's color, 
      //while the displayed color value is the normal color name
      var plantColors = myObj[clkdElt.getAttributeNS(null, "desc")][6];

      //if no colors are available place one default value green in the array
      if (plantColors === "") {
        plantColors = ["green"]; //used to have plantColors.unshift("green");
      } 
      else if(plantColors.split(",").length > 0) {
        plantColors = plantColors.split(", ");
        if (!plantColors.includes("green"))
        {        
          plantColors.unshift("green");
        }
      }
      //note, text code for a down arrow txt:"\uf0d7"

      //custom colors, the var is assigned a function
      var convertColors = colorCoder;
      let offset = 2;
      for (let i = 0, l = plantColors.length; i<l; i++) {
        //convert colors to camel case, for when composed of more than one word
        //the text shows normal color name, with spaces, while desc holds camelCased color name
        clkdElt.parentElement.appendChild(makeText(
          {x:Number(clkdElt.getAttributeNS(null, "x")),
           y:Number(clkdElt.getAttributeNS(null, "y"))+munit*offset*1.5,
           cls:"fauxLi",
           clr:convertColors(plantColors[i]),
           txt:plantColors[i],
           desc:convertColors(plantColors[i])   
          }));
        offset += 2;
      }

      offset = 2;
      //Add OTHER INFO fields
      //The "desc" field of the clkdElt (plant name) holds latin name
      //This "latin name" is used as a key to pull all other information fields
      var plantInfoFields = {7:"Leaves: ", 8:"Bloom Time: ", 10:"Sun: ",
                             11:"Roots: ", 12:"Garden Quantities: ", 16:"Companions: ", 
                             17:"Allies: ", 18:"Enemies: ", 19:"Soil: "};
      for (let f in plantInfoFields) {
        if (myObj[clkdElt.getAttributeNS(null, "desc")][f] === "") {
          continue;
        }
        let infoLine = makeForeignObj({
          x:Number(clkdElt.getAttributeNS(null, "x")) + munit * 7,
          y:Number(clkdElt.getAttributeNS(null, "y")) + offset,
          w:200,
          h:70,
          cls:"plantInfo", 
          tp:"div",
          txt:plantInfoFields[f] + myObj[clkdElt.getAttributeNS(null, "desc")][f]});
        clkdElt.parentElement.appendChild(infoLine);
        offset += infoLine.children[0].getBoundingClientRect().height;
      }
    } else if (this.status == 404) {//was xhr. instead of this.
    console.log("text file (source) not found");
    }
  }
  xhr.open("get", "plants.json", true);
  xhr.send();
}

//////////////////////////////////////////////////////////////////////
//this function converts color codes to strings and back, depending on
//the input; it also holds custom color specs 
function colorCoder (string) {
  let colorCodes = {
    //darkgreen is a special case, used as default, keep as is below
    "darkgreen":"rgba(0,100,0,0.75)",
    "green":"rgb(0,100,0)",
    "coral":"rgb(255, 102, 102)",
    "creamy white":"rgb(255, 253, 230)",
    "dark blue":"rgb(0, 0, 153)",
    "dark pink":"rgb(255, 102, 153)",
    "dark purple":"rgb(103, 0, 103)",
    "deep green":"rgb(0, 102, 0)",
    "emerald green":"rgb(38, 115, 38)",
    "greenish-white":"rgb(217, 242, 217)",
    "greenish-yellow":"rgb(230, 255, 179)",
    "lavender":"rgb(150, 153, 255)",
    "light blue":"rgb(179, 218, 255)",
    "light green":"rgb(204, 255, 204)",
    "light pink":"rgb(255, 204, 225)",
    "lilac":"rgb(230, 204, 255)",
    "magenta":"rgb(255, 0, 255)",
    "peach":"rgb(253, 217, 181)",
    "pink":"rgb(255, 102, 153)",
    "pinkish-lavender":"rgb(242, 211, 227)",
    "purple and yellow":"rgba(0,100,0,0.75)",//todo: need code instead of dark green
    "purple red":"rgb(192, 0, 64)",
    "purplish-pink":"rgb(192, 96, 166)",
    "rose":"rgb(255, 153, 204)",
    "violet":"rgb(230, 130, 255)",
    "white and purple":"rgba(0,100,0,0.75)",//todo: need code instead of dark green
    "yellowish-green":"rgb(198, 210, 98)"};
  
	//if an rgb code is sent, return it's normal, displayable name
  if (string.slice(0,3) === "rgb") {
    for(var key in colorCodes) {
      if(colorCodes[key] === string) {
          return key;
      }
    }
  } 
  //if a color name that needs to be converted is sent, return rgb
  else if (string in (colorCodes)) {
    return colorCodes[string];
  }
  //otherwise return a color name without spaces in camel case
  //this is used when the color isn't listed in colorCodes, but
  //its name is valid when it's in camel case notation
  else {
    return string.replace(/\s+(.)/g, function (match, group) { 
      return group.toUpperCase()  
    })
  }
}

//////////////////////////////////////////////////////////////////////
//this function creates and saves to Local Storage an SVG group representing
//a garden with functionality to move, resize & delete the group, rename the
//planting area/garden, and set its sun & soil availability.
function addGarden(elt){
  
  //var to capture widths of sun & tools gears, used for name centering
  let widthOfSunToolsGear = 0;

  //create a flag used to hide sun, tools, resize on reload;
  let oldGarden = true; 
  
  //to indicate that a NEW planting area is created as opposed to an existing one
  //loaded from local storage, the supplied id for it is set to null, thus no gId
  if (!elt.gId) {
    oldGarden = false;
    //when creating a NEW garden, as opposed to loading an existing one, create and record 
    //the new garden id: 1 for the first one or the stored garden counter grdnCntr plus one.
    if (!localStorage.aas_myGardenVs_grdns) {
      elt.gId = 1;
      localStorage.setItem("aas_myGardenVs_grdns","1");
    } else {
      let IDs = localStorage.aas_myGardenVs_grdns.split(",");
      elt.gId = Number(IDs[IDs.length-1])+1;
      //add the new garded id to local storage, i.e. update garden counter
      localStorage.aas_myGardenVs_grdns += "," + elt.gId.toString();
    }
    //record the new garden area data in local storage and update the total garden count
    localStorage.setItem("aas_myGardenVs_grdn"+elt.gId, elt.x+ "," + elt.y + "," + 
                         elt.w + "," + elt.h + "," + elt.tx + "," + elt.ty +
                         "," + elt.nm + "," + elt.sn + "," + elt.sl);
  }
  
  //class is always "garden" for a garden, so setting it here
  elt.cls = "garden";
  
  //the group, grp, below keeps all elements of one garden
  //together so that they move together in the SVG area
  var grp = document.createElementNS(xmlns, "g");
  grp.setAttributeNS(null, "transform", "translate("+elt.tx+", "+elt.ty+")");
  grp.setAttributeNS(null, "id", "g_"+elt.gId); 
  grp.setAttributeNS(null, "class", elt.cls+"Grp");
  svgPlace.appendChild(grp);

  //the rectangle (rect) of the planting area (garden) 
  let gardenElt = document.createElementNS(xmlns, "rect");
  gardenElt.setAttributeNS(null, "x", elt.x);  //arguments: namespace=null, varName="x", varValue=x
  gardenElt.setAttributeNS(null, "y", elt.y);
  gardenElt.setAttributeNS(null, "width", elt.w); //plant size is doubled for display improvement
  gardenElt.setAttributeNS(null, "height", elt.h);
  gardenElt.setAttributeNS(null, "class", elt.cls);
  //todo: is this ever needed?
  if (elt.desc) {
    gardenElt.setAttributeNS(null, "desc", elt.desc);}
  grp.appendChild(gardenElt);
  
  //create a sun drop down button using supplied text value, stored in
  //sn var for an existing garden and sun icon "\uf185" for a new garden
  gardenElt = makeText({
    x:elt.x+munit*0.5, 
    y:elt.y+munit*2, 
    cls:"fauxUl ulSun",
    txt:elt.sn+" \uf0d7"});
  grp.appendChild(gardenElt);
  widthOfSunToolsGear += gardenElt.getBoundingClientRect().width;
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");}

  //create the garden tool box - a gear icon drop down
  gardenElt = makeText({
    x:elt.x + Number(grp.children[0].getAttributeNS(null, "width"))-munit*3,
    y:elt.y+munit*2, 
    cls:"fauxUl ulTools", 
    txt:"\xa0\uf013"
  });
  grp.appendChild(gardenElt);
  widthOfSunToolsGear += gardenElt.getBoundingClientRect().width;
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");}

  
  //the following creates "Garden Name" editable text element using supplied value 
  //for any existing gardens and "New Garden" for a new garden
  //for y-value, check if there is enough room: 
  // width of parent minus approximate width of sun and tools gears, from elt.desc, 
  // compared to number of characters in the garden name multiplied by munit (7.37) 
  // (approximate size of a letter); if not enough room, y is adjusted so that the 
  // garden name is placed above the garden
  let nmY = elt.y-munit/2;
  let nmW = 150;
  if (elt.w - widthOfSunToolsGear < nmW) {
    nmY = elt.y-munit*2.7;
  }
  grp.appendChild(makeForeignObj({
      //center the garden name: parent's x and w less half of garden name width
      x:(elt.x + elt.w/2 - nmW/2),
      y:nmY,
      w:nmW,
      h:25,
      desc:widthOfSunToolsGear,
      cls:"editable", 
      tp:"input",
      txt:elt.nm
    }));
//   gardenElt.setAttributeNS(null, "contentEditable", "true");

  //create the soil indicator - drop up
  gardenElt = makeText({
    x:elt.x + munit*1, 
    y:elt.y + Number(grp.children[0].getAttributeNS(null, "height"))-munit,
    cls:"fauxUl ulSoil",  //this order has to remain the same, otherwise use Array.from(group.classList).findIndex(x=>x.includes("li")) when retrieving ulSoil
    txt:elt.sl+" pH\xa0\uf102"
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");}

  //call the coloring of the garden with sun/soil choice combo
  sunSoilChoice(grp);

  //the following two SVG texts display the Width and Height of the planting area
  //the width and height are extracted from rect, because they're multiplied by 2
  //height
  gardenElt = makeText({
    x:elt.x + Number(grp.children[0].getAttributeNS(null, "width")),
//     y:elt.y + Number(grp.children[0].getAttributeNS(null, "height"))/2, //if want to center sizer
    y:elt.y + munit*2,
    cls:"sizeInd", 
    txt:formatSizeDisplay(elt.h/size)
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");}

  //width
  gardenElt = makeText({
//     x:elt.x+Number(grp.children[0].getAttributeNS(null, "width"))/2, //if want to center sizer
    x:elt.x + munit,
    y:elt.y+Number(grp.children[0].getAttributeNS(null, "height"))+munit*1.3, 
    cls:"sizeInd",  
    txt:formatSizeDisplay(elt.w/size)
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");}

  //create the "resizing" triangle displayed in the bottom right corner 
  //of the garden rectangle; triangle's color is set in visual.css file
  gardenElt = document.createElementNS(xmlns, "polygon");
  gardenElt.setAttributeNS(null, "points", createTriPts(
    elt.x+Number(grp.children[0].getAttributeNS(null, "width")), 
    elt.y+Number(grp.children[0].getAttributeNS(null, "height"))));
  gardenElt.setAttributeNS(null, "class", "resize");
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttributeNS(null, "display", "none");} 

  //the returned grp.id is used for duplicating gardens
  return grp.id;
 
}

//////////////////////////////////////////////////////////////////////
//create and return points for a trianlge as "a,b a,c b,c" string, based on the supplied corner and its x & y coordinates
function createTriPts(x, y) {
  return x + "," + (y-munit*4) //X & Y positions of the right side of the rectangle
  + " " + x + "," + y //X & Y positions of the right bottom corner of the rectangle
  + " " + (x-munit*4) + "," + y; //X & Y positions of the bottom of the rectangle
}

//////////////////////////////////////////////////////////////////////
//this function provides decision making for when a garden is clicked
function gardenFork(clkdElt) {
  
  //capture the x&y along with tX&tY of the garden
  let gnX = Number(clkdElt.parentElement.children[0].getAttributeNS(null, "x"));
  let gnY = Number(clkdElt.parentElement.children[0].getAttributeNS(null, "y"));
  let gnTX = clkdElt.parentElement.transform.baseVal.getItem("translate").matrix.e;
  let gnTY = clkdElt.parentElement.transform.baseVal.getItem("translate").matrix.f;
  let gnW = Number(clkdElt.parentElement.children[0].getAttributeNS(null, "width"));
  let gnH = Number(clkdElt.parentElement.children[0].getAttributeNS(null, "height"));

  //faux UL click
  if (clkdElt.classList.contains("fauxUl")){
    //sun
    if (clkdElt.classList.contains("ulSun")) {
      fauxUIDropDown(clkdElt, ["Full", "Part", "Shade"]);
    }
    //soil
    else if (clkdElt.classList.contains("ulSoil")) {
      fauxUIDropDown(clkdElt, ["Acidic", "Neutral", "Alkaline"], undefined, -1);
    }
    //tools
    else if (clkdElt.classList.contains("ulTools")) {
      //if no changes have been made to the garden, most of the tools aren't available,
      //therefore display a note to let the user know about it
      let otherTools = true;
      let choices = ["Duplicate this garden"];
      
      //if there are any plants in the garden, toggle their photo display
      if (clkdElt.parentElement.getElementsByTagName("g").length > 0) {
        //get the name of the one plant in the garden
        choices.push("Toggle all photos");
        otherTools = false;
      }
      
      //if the name has been changed from New Garden
      if (clkdElt.parentElement.getElementsByClassName("editable")[0].children[0].value != "New Garden") {
        choices.push("Pull plants for " + clkdElt.parentElement.getElementsByClassName("editable")[0].children[0].value);
        otherTools = false;
      }
      
      //if there is one, and only one, plant in the garden
      if (clkdElt.parentElement.getElementsByTagName("g").length === 1) {
        //get the name of the one plant in the garden
        choices.push("Pull companions for " + clkdElt.parentElement.getElementsByClassName("plant")[0].textContent);
        otherTools = false;
      }
      
      //if sun and soil have been set
      if (clkdElt.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0]!="\uf185" &&
          clkdElt.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0]!="Soil") {
        choices.push("Pull plants based on sun & soil");
        otherTools = false;
      }
      
      if (otherTools) {
        choices.push("Other tools are available"); 
        choices.push("when a single plant is added,");
        choices.push("a garden is named,");
        choices.push("or sun and soil are set");
      }
      fauxUIDropDown(clkdElt, choices, munit);
    }
  }
  
	//faux LI choice click, run the choice and hide LI choices
  else if (clkdElt.classList.contains("fauxLi")){
    
    //sun and soil changes are handled the same, by changing the garden's gradient fill
    if (["liSun", "liSoil"].some(className => clkdElt.classList.contains(className))) {

      //update the "drop down UL button" text with the value chosen + arrow
      //to do so, get the drop down UL: find the index of li sun/soil class 
      //name in the classList and change li to ul
      let ddUl = clkdElt.parentElement.getElementsByClassName(clkdElt.classList[
        Array.from(clkdElt.classList).findIndex(x=>x.includes("li"))].replace("li", "ul"))[0];
      //change li to ul to get the drop down UL and set its text to chosen
      ddUl.textContent = clkdElt.textContent + " " + ddUl.textContent.split(" ")[1];
      
      //call the update of the garden's colors
      sunSoilChoice(clkdElt.parentElement);
      
      //call the update of the local storage with sun & soil choices
      updateStoredData(
        clkdElt.parentElement.id, 
        clkdElt.classList[Array.from(clkdElt.classList).findIndex(x=>x.includes("li"))].replace("li", "").toLowerCase(), 
        clkdElt.textContent);
    }
    
    //if one of tools choices is clicked
    else if (clkdElt.classList.contains("liTools")) {
      if (clkdElt.textContent === "Duplicate this garden") {
        //the yOffset is needed for the vertical offset of duplicate garden and its plants
        let yOffset = gnH+munit * 2;
        //clone the garden
        let dupGardenId = addGarden(
          {gId:null, 
           x:gnX,
           y:gnY + yOffset,
           w:gnW,
           h:gnH,
           tx:gnTX,
           ty:gnTY,
           nm:"Duplicate Garden",
           sn:clkdElt.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0],
           sl:clkdElt.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0]
          });
        //if there are any plants in the garden, clone them too
        let len = clkdElt.parentElement.getElementsByTagName("g").length;
        if (len) {
          for (let i = 0; i < len; i++) {
            let dupPlantSpecs = 
                localStorage.getItem(
                  "aas_myGardenVs_plnt" + 
                  clkdElt.parentElement.getElementsByTagName("g")[i].id.split("_")[1]).split(",");
            addPlant ({
              pId:null, 
              x:Number(dupPlantSpecs[0]),
              y:Number(dupPlantSpecs[1]) + yOffset ,
              w:Number(dupPlantSpecs[2]),
              h:Number(dupPlantSpecs[3]),
              tx:Number(dupPlantSpecs[4]), 
              ty:Number(dupPlantSpecs[5]), 
              nm:dupPlantSpecs[6],
              gId:dupGardenId,
              lnm:dupPlantSpecs[8], //plant's latin name
              img:dupPlantSpecs[9], //image file & display and rect display value
              clr:dupPlantSpecs[10]
            })
          }
        }
      }
      
      //place in garden, companions, sun/soil plants container to the right of the clicked garden 
      //todo: need to check if no space to the right, in which case - left
      else if (["Pull plants for", "Pull companions", "Pull plants bas"]
               .includes(clkdElt.textContent.slice(0,15))) {
        let flt = null, tp = null, fp = null;
        switch (clkdElt.textContent.slice(0,15)) {
          case "Pull plants bas":
            flt = [clkdElt.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0].toLowerCase(),
                   clkdElt.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0].toLowerCase()],
            tp = "sunSoil";
            break;
          case "Pull plants for":
            flt = clkdElt.parentElement.getElementsByClassName("editable")[0].children[0].value.toLowerCase();
            tp = "gName";
            break;
          case "Pull companions":
            fp = clkdElt.parentElement.getElementsByTagName("g")[0].children[0].getAttributeNS(null, "desc"),
            tp = "companions";
            break;
          }
        addPlantMenu({
          xPos: gnX + gnTX + gnW + munit * 2 + "px",
          yPos: gnY + gnTY + "px",
          type: tp,
          filter: flt,
          forPlant: fp,
          gId: clkdElt.parentElement.id, 
          gX: gnX,
          gY: gnY,
          gW: gnW,
          gH: gnH
        });
      }

      else if (clkdElt.textContent === "Toggle all photos") {
        
        let gardenPlants = clkdElt.parentElement.getElementsByTagName("g");
        let sd = localStorage.getItem(
          "aas_myGardenVs_plnt" + gardenPlants[0].id.split("_")[1]).split(",");
        //if the photo is shown/size for the first plant in the garden
        //set this displayAll to 1 (true), else 0 (false)
        let displayAll = Number(sd[9])<2?1:0;
          
        for (let i = 0, len = gardenPlants.length; i < len; i++) {
          
          sd = localStorage.getItem("aas_myGardenVs_plnt" + gardenPlants[i].id.split("_")[1]).split(",");

          let specs = {
            x:Number(sd[0]),
            y:Number(sd[1]),
            w:Number(sd[2]),
            h:Number(sd[3]),
            nm:sd[6],
            img:Number(sd[9])
          }
          //if display all, show size and photo, if it's available
          if (displayAll) {
            //photo is available but hidden -> add it
            if ([1,3].includes(specs.img)) {
              togglePlantLook(gardenPlants[i], specs, 1, 1);
            } 
            else {
              togglePlantLook(gardenPlants[i], specs, 1, 0);
            }
            //depending on whether img exists, update local storage to 0 or 1
            specs.img === 0?updateStoredData(gardenPlants[i].id, "display", 2):updateStoredData(gardenPlants[i].id, "display", 3);
          } 
          else {
            //size and photo (if exists) are shown -> hide them
            togglePlantLook(gardenPlants[i], specs, 0);
            //depending on whether img exists, update local storage to 0 or 1
            specs.img === 2?updateStoredData(gardenPlants[i].id, "display", 0):updateStoredData(gardenPlants[i].id, "display", 1);
          }
        }
      }
    }
  }

  //display editing buttons (sun choices, garden name, toolbox) when a garden is clicked
  else if (clkdElt.classList.contains("garden")){
    
    hideDropDown();
    
    //if the cicked garden is a simple container, it doesn't have sizers and fauxUls, thus exit
    if (!clkdElt.parentElement.getElementsByClassName("fauxUl").length) {return;}
    
    //number of garden objects to hide - set to 7, instead of 
    //let l = clkdElt.parentElement.childElementCount;
    //to only toggle sun, soil, tools, and sizers
    let l = 8;
    
    //toggle the display of the size, sun and toolbox drop down buttons, not their choices
    //not the sun or toolbox drop down choices
    if (clkdElt.parentElement.getElementsByClassName("resize")[0].getAttributeNS(null, "display") != "none") {
      
      //start at 1, because 0 is the rect
      for (var i = 1; i < l; i++){
        //2 is the name
        if (i===3){continue;}
        clkdElt.parentElement.children[i].setAttributeNS(null, "display", "none");
      }
    } else {
      for (var i = 1; i < l; i++){
        if (i===3){continue;}
        clkdElt.parentElement.children[i].setAttributeNS(null, "display", "block");
      }
    }

  }
}

//////////////////////////////////////////////////////////////////////
//this function toggles drop down choices mimicking UI drop down
//for the group id and values supplied as parameters
//the optional pos parameter sets the x offset and y direction (1 - down, 0 - up)
function fauxUIDropDown(clkdElt, values, xOff=0, yDir=1) {
  
  //check if the click is on a Ul that already has 'drop down' values displayed
  let exitFlag = false;
  if (!values || Array.from(clkdElt.parentElement.getElementsByClassName("fauxLi")).map(
    x=>x.textContent)[0]===values[0]) {
    exitFlag = true;
  }
  
  hideDropDown();
  
  //show drop down menu, using values supplied
  if (!exitFlag) {
    for (let i = 0, l = values.length; i < l; i++) {
      let li = clkdElt.parentElement.appendChild(makeText(elt={
        //x is based on clicked faux UL, slightly shifted to the right
        x:(Number(clkdElt.getAttributeNS(null, "x"))+munit*2) + xOff, 
        //y position is incremented for each value added
        y:(Number(clkdElt.getAttributeNS(null, "y")) + 
           yDir * munit * (3 + i * 3)),
        cls:"fauxLi" + " li" + clkdElt.classList[1].substr(
          2,clkdElt.classList[Array.from(clkdElt.classList).
                              findIndex(x=>x.includes("ul"))].length), 
        clr:"rgba(101, 105, 70, 0.75)",
        txt:values[i]}));
      if (xOff) {
        li.setAttributeNS(null, "text-anchor", "start");
      } else {
        li.setAttributeNS(null, "text-anchor", "middle");
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////
//adds plant's look: photo and size, centered above the plant
function togglePlantLook(grp, specs, showHide, wImg) {
  
  let halfPt = specs.x
    + Math.round((
      grp.getElementsByClassName("plant")[0]
      .getComputedTextLength()/2 + Number.EPSILON)*100)/100;

  //display the image if needed
  if (showHide && wImg) {
    grp.appendChild(makePic({
      x:halfPt,
      y:specs.y - munit*3.5,
      nm:specs.nm
    }));
  } 
  //display size
  if (showHide) {
    grp.appendChild(makeText({
    x:halfPt,
    y:specs.y - munit*2,
    cls:"plantLook", 
    clr:"rgba(0,100,0,0.75)",
    txt:"avg: " + formatSizeDisplay(specs.w) + " x " + formatSizeDisplay(specs.h), 
    desc:specs.lnm
    }));
  }
  //hide size and image
  else {
    for (let i = 0, l = grp.getElementsByClassName("plantLook").length; i < l; i++){
      grp.removeChild(grp.getElementsByClassName("plantLook")[0]);
    }
  }
}


//////////////////////////////////////////////////////////////////////
//this function adds a plant to the garden, it's called by a click on li or onload
//the plant consists of its name in color, plus size and photo, if chosen by user
function addPlant(elt) {
                 
  //if the id of elt (pId) is 0 then this is a new plant, as opposed to 
  //one loaded from localStorage; this new plant's pId needs to be set 
  //to either a 1 for a very first plant (when there is nothing in  
  //localStorage.aas_myGardenVs_plnts) or the highest number in 
  //localStorage.aas_myGardenVs_plnts plus one
  if (!elt.pId || elt.pId===0){ 
    if (!localStorage.aas_myGardenVs_plnts){
      elt.pId = 1;
      //record new plant id in the local storage plnts counter
      localStorage.setItem("aas_myGardenVs_plnts","1");
    } else {
      //pull all IDs into an array
      let IDs = localStorage.aas_myGardenVs_plnts.split(",");
      //take the last (highest) ID and add one to it
      elt.pId = Number(IDs[IDs.length-1])+1;
      //record new plant id in the local storage plnts counter
      localStorage.aas_myGardenVs_plnts += ","+elt.pId.toString();
    }
    //when a new plant is created, make sure it's not place outside of screen boundaries
    if (elt.x < 0) {elt.x = 0;}
//     if (elt.x > Number(svgPlace.getAttributeNS(null, "width"))) {
//       elt.x = Number(svgPlace.getAttributeNS(null, "width")) - munit;} 
    if (elt.y > Number(svgPlace.getAttributeNS(null, "height"))) {
      elt.y = Number(svgPlace.getAttributeNS(null, "height")) - munit*1.5;}
    //record the new plant data in the local storage; 
    //until the color is changed, it's recorded as 0 to avoid storing what's not needed
    localStorage.setItem("aas_myGardenVs_plnt"+elt.pId, elt.x+","+elt.y+","+elt.w+","+elt.h+","
                         +elt.tx+","+elt.ty+","+elt.nm+","+elt.gId+","+elt.lnm+","+elt.img+","+"0");
  }
  //set plant name color to green unless another color is saved
	if (!elt.clr || elt.clr === "0"){
    elt.clr = "rgba(0,100,0,0.75)";
  }
  
  //the group below, grp, is for keeping all elements of one plant together
  let grp = document.createElementNS(xmlns, "g");
  grp.setAttributeNS(null, "transform", "translate("+elt.tx+", "+elt.ty+")");

  //if the garden id is 0, the plant is free-standing, not a part of a garden
  //note: when data is added to localStorage, null or 0 value is converted to string
  if (!elt.gId || elt.gId === "0") {
    svgPlace.appendChild(grp);
  }
  //otherwise, if garden id is not 0, put the plant in its garden
  else {
    let inGarden = svgPlace.getElementById(elt.gId);
    inGarden?inGarden.appendChild(grp):svgPlace.appendChild(grp);
  }
    
  //the id attribute of the plant SVG element is prefixed with a "p_" to 
  //differentiate from garden id, where it's prefixed with a "g_"
  grp.setAttributeNS(null, "id", "p_"+elt.pId);
  grp.setAttributeNS(null, "class", "plantGrp");
  
  //shorten the name to 15 characters
  let shortenedName = elt.nm;
  if (elt.nm.length > 15) {shortenedName = elt.nm.slice(0,14)+"...";}
  //create a text with plant's common name
  grp.appendChild(makeText({
    x:elt.x, 
    y:elt.y, 
    cls:"plant", 
    clr:colorCoder(elt.clr),
    txt:shortenedName,
    desc:elt.lnm}));

  //depending on img setting, call the function to add appropriate plant's look
  //if plant's elt img is set to 3, the photo is available and will be displayed
  //otherwise, the photo is either unavailable or doesn't need to be displayed
  if (Number(elt.img) > 1 ) {
    if (elt.img === "3") {
      togglePlantLook(grp, elt, 1, 1);
    } 
    else {
      togglePlantLook(grp, elt, 1, 0);
    }
  }
 
  //return the group with the plant
  return grp;
  
}

//////////////////////////////////////////////////////////////////////
//this function supports clicking on any part of a plant 
//it toggles plant's: pic, size, info, flowering colors
function plantFork(tgt) {
  
  let plantName = clickedGroup.getElementsByClassName("plant")[0];

  //if the clicked part is a plant class (name text)
  if (tgt.classList.contains("plant")) {

    let sd = localStorage.getItem(
    "aas_myGardenVs_plnt"+clickedGroup.id.substring(2,clickedGroup.id.length)).split(",");

    let specs = {
      x:Number(sd[0]),
      y:Number(sd[1]),
      w:Number(sd[2]),
      h:Number(sd[3]),
      nm:sd[6],
      img:Number(sd[9])
    }

    hideDropDown();
    
    //reminder (need to enumerate):
      // 0 - photo is not available, size is hidden
      // 1 - photo is available, it and size are hidden
      // 2 - photo is not available, size is shown
      // 3 - photo is available, it and size are shown
    //up arrow code - uf0d7, uf0d8
    //depending on img setting, call the function to add appropriate plant's look

    //size is hidden -> display it
    if (specs.img < 2) {
      //photo is available but hidden -> add it
      if (specs.img === 1) {
        togglePlantLook(clickedGroup, specs, 1, 1);
      } 
      else {
        togglePlantLook(clickedGroup, specs, 1, 0);
      }
      //depending on whether img exists, update local storage to 0 or 1
      specs.img === 0?updateStoredData(clickedGroup.id, "display", 2):updateStoredData(clickedGroup.id, "display", 3);
      //add info and flower colors
      getPlantInfo(tgt, 0);
    } 
    else {
      //size and photo (if exists) are shown -> hide them
      togglePlantLook(clickedGroup, specs, 0);
      //depending on whether img exists, update local storage to 0 or 1
      specs.img===2?updateStoredData(clickedGroup.id, "display", 0):updateStoredData(clickedGroup.id, "display", 1);
    }
  }
  
  //if one of the color choices is clicked, color the plant name that color
  else if (tgt.classList.contains("fauxLi")){
      plantName.style.fill = tgt.getAttribute("desc").trim();
//       clickedGroup.getElementsByClassName("plant")[0].style.fill = tgt.getAttribute("desc").trim();
      //update local storage
    if (tgt.getAttribute("desc").trim()==="rgb(0,100,0)") {
      updateStoredData(clickedGroup.id, "color", 0);
    } else {
      updateStoredData(clickedGroup.id, "color", tgt.textContent);
    }
  }
}

//////////////////////////////////////////////////////////////////////
//this function creates an SVG text, using x, y, class name, text and event (optional) supplied
function makeText(elt) {
  let txtElt = document.createElementNS(xmlns, "text");
  if (elt.desc){txtElt.setAttributeNS(null, "desc", elt.desc);}
  if (elt.clr) {
    txtElt.setAttributeNS(null, "fill", elt.clr);
  }
  txtElt.setAttributeNS(null, "x", elt.x);
  txtElt.setAttributeNS(null, "y", elt.y);
  txtElt.setAttributeNS(null, "class", elt.cls);
  let txtVal = document.createTextNode(elt.txt);
  txtElt.appendChild(txtVal);
  return txtElt;
}

//////////////////////////////////////////////////////////////////////
// garden name - editable text field as a foreign object;
// the garden name is centered in the top of the garden area; if the 
// garden is very narrow, the garden name is moved up, above the garden
// to determine if the garden is too small for the name to fit inside, name's
// width is subtracted from garden width less the widths of sun & tools gears
// the combined width of sun & tools gears is supplied and provided in desc
function makeForeignObj(elt) {
  
  let foreigner = document.createElementNS(xmlns, "foreignObject");
  foreigner.setAttributeNS(null, "x", elt.x);
  foreigner.setAttributeNS(null, "y", elt.y);
  foreigner.setAttributeNS(null, "width", elt.w);
  foreigner.setAttributeNS(null, "height", elt.h);
  foreigner.setAttributeNS(null, "class", elt.cls);
  if (elt.desc) {foreigner.setAttributeNS(null, "desc", elt.desc);}
  
  let txt = document.createElement(elt.tp);
//   txt.className = elt.cls;
  if (elt.tp === "input") {
    txt.value = elt.txt;
  } else {
    txt.textContent = elt.txt;
  }
  foreigner.appendChild(txt);
  
  //the xml div is for IE
//   let inDiv = document.createElement("div");
//   inDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
//   inDiv.appendChild(txt);

  return foreigner;
}

//////////////////////////////////////////////////////////////////////
//this function adds a picture
function makePic(specs) {
  let imgElem = document.createElementNS(xmlns, "image");
  imgElem.setAttributeNS(null, "class", "plantLook");
  imgElem.setAttributeNS(null, "width", 70); //universal plant image width
  imgElem.setAttributeNS(null, "height", 70); //universal plant image height
  imgElem.setAttributeNS(null, "x", Number(specs.x)-35);
  imgElem.setAttributeNS(null, "y", Number(specs.y)-70);
  
  //set image address, remove spaces, dashes, quotes, v., (), & from the plants' names
  imgElem.setAttributeNS(
    null, 
    "href", 
    "pictures/" + specs.nm.replace(/( |-|\"|\'|v\.|\(|\)|-|&)/g,"")+"1.jpg"); //img address
  imgElem.setAttributeNS(null, "opacity", 0.85); 
  return imgElem;
}

//////////////////////////////////////////////////////////////////////
//this function provides garden color changing functionality
//for sun and soil dropdowns; parentElt is the parent of clicked element;
function sunSoilChoice(parentElt) {
  //fill with URL of color gradient for selected sun/soil combo
  parentElt.children[0].setAttributeNS(null, "fill", 
     "url(#"
     + parentElt.getElementsByClassName("ulSun")[0].textContent.split(" ")[0].replace("\uf185", "Full")
     + "_"
     + parentElt.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0].replace("Soil","Neutral")
     + ")");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////
//getMousePosition() returns the coordinates in SVG space, defined by the viewBox 
//attribute, using the Current Transformation Matrix to convert clickPos x & y
function getMousePosition(evt) {
  let CTM = svgPlace.getScreenCTM();
    //for mobile, if multiple touches take the first one only
    if (evt.touches) { evt = evt.touches[0]; }
  return {
    x: (evt.clientX - CTM.e) / CTM.a,
    y: (evt.clientY - CTM.f) / CTM.d
  };
}

//////////////////////////////////////////////////////////////////////////////////////
//triggered by mouse or finger down on svg; 
function touchDown(evt) {
  
  if (evt.type.substring(0,5)==="touch"){
    mobile = true;
  }
  if (mobile) {
    if (evt.type.substring(0,5) === "mouse") {
      return;
    }
  }
  
  //if tapped on garden name, increase the font to 16px to emphasize the name change and prevent zooming
  if (evt.target.parentElement.classList.contains("editable")) {
    evt.target.style.fontSize = "16px";
  }
  
  //the some() method executes the callback function once for each element in
  //the array until it finds the one where the call back returns a true value
  if (["garden","plant","resize","plantLook","plantInfo","fauxUl","fauxLi"].some(
  clsName => evt.target.classList.contains(clsName))) {
    
    //check if it's a resize
    evt.target.classList.contains("resize")?resize = true:resize = false;
    
    //the clickedGroup is set to a group, evt.target is always the group's child
    if (!clickedGroup){
      clickedGroup = evt.target.parentElement;
    }
    //mobile
    if (evt.touches) {evt = evt.touches[0];}
    
    //set original click X & Y for resizing
    if (resize){
      clickPos.x = evt.clientX;
      clickPos.y = evt.clientY;
    }
    
    //adjust clicked point by SVG's viewbox
    offset = getMousePosition(evt);

    //get all of clickedGroup's transforms
    let transforms = clickedGroup.transform.baseVal;

    //ensure the first transform is a translate transform; if the first transform
    //is not a translation or the element does not have a transform, then add one
    if (transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE || transforms.length === 0) {
      let translate = svgPlace.createSVGTransform();
      translate.setTranslate(0, 0);
      clickedGroup.transform.baseVal.insertItemBefore(translate, 0);
    }
    //get initial translation amount (traslate is set above to item 0)
    transform = transforms.getItem(0);
    offset.x -= transform.matrix.e;
    offset.y -= transform.matrix.f;
    //same as the two lines above
//     offset.x -= transforms.getItem(0).matrix.e;
//     offset.y -= transforms.getItem(0).matrix.f;
  }
  
  //hide all shown menus, unless a click is on classes specified above or the faux Ul
  else if(!evt.target.classList.toString().includes("faux")){
    hideDropDown();
  }
}

//////////////////////////////////////////////////////////////////////////////////////
//moving a mouse or finger around, linked in html
//when an element is resized, its size is adjusted by the change in mouse/finger position
//when an element is moved, its position is set to the mouse/finger position, adjusted by svg matrix
function dragging(evt) {
  
  if (clickedGroup) {
    
    evt.preventDefault();
    coord = getMousePosition(evt);
    
    //remove any dropdown menus within the garden
    hideDropDown()
    
    //RESIZING
    if (resize) {
      
      //mobile
      if (evt.touches) { evt = evt.touches[0]; }

      //rect is always the first child of garden group, clickedGroup here
      let rect = clickedGroup.getElementsByTagName("rect")[0];
      
      //remove any dropdown menus within the garden
//       hideDropDown();
      
      //adjustments to width and height: the X and Y of the point of click/touch 
      //minus starting X and Y point of click
      let adjW = evt.clientX - clickPos.x;
      let adjH = evt.clientY - clickPos.y;

      //the new width and height are stored in newW & newH
      let newW = Number(rect.getAttributeNS(null, "width"))+adjW;
      let newH = Number(rect.getAttributeNS(null, "height"))+adjH;
      
      //the width & height can't be negative, and shouldn't be less than 6"x6";
      let minSize = 6 * size;
      if (newW < minSize) {
        newW = minSize;
        adjW = 0;
      }
      if (newH < minSize) {
        newH = minSize;
        adjH = 0;
      }

      //update the width and height of the rectangle
      rect.setAttributeNS(null, "width", newW);
      rect.setAttributeNS(null, "height", newH);

      //keep garden name centered or above, if not enough room for it
      let gName = clickedGroup.getElementsByClassName("editable")[0];
      gName.setAttributeNS(
        null, 
        "x", 
        Number(rect.getAttributeNS(null, "x")) +
        Number(rect.getAttributeNS(null, "width"))/2 -
        Number(gName.getAttributeNS(null, "width"))/2);
      
      //check if enough room: new width newW minus the widths of sun and tools gears, from gName.desc, 
      //compared to number of characters in the garden name times munit/2 (approximate size of a letter, ~7.11)
      if ((newW - Number(gName.getAttributeNS(null, "desc"))) < 
          Number(gName.getAttributeNS(null, "width"))) {
        gName.setAttributeNS(null, "y", Number(rect.getAttributeNS(null, "y")) - munit * 2.7);
      } else {
        gName.setAttributeNS(null, "y", Number(rect.getAttributeNS(null, "y")) - munit / 2);
      }

      //adjust the tools gear position, when its garden is resized
      let toolGear = clickedGroup.getElementsByClassName("ulTools")[0];
      toolGear.setAttributeNS(null, "x", Number(toolGear.getAttributeNS(null, "x"))+adjW);

      //adjust the soil selector position, when its garden is resized
      let soilGear = clickedGroup.getElementsByClassName("ulSoil")[0];
      soilGear.setAttributeNS(null, "y", Number(soilGear.getAttributeNS(null, "y"))+adjH);

      //update the size indicators
      let elts = clickedGroup.getElementsByClassName("sizeInd");
      
      //height
      elts[0].setAttributeNS(
        null, 
        "x", 
        Number(elts[0].getAttributeNS(null, "x"))+adjW);
      //update the text of the height indicators
      elts[0].textContent = formatSizeDisplay(Number(rect.getAttributeNS(null, "height"))/size);
      
      //width
      elts[1].setAttributeNS(
        null, 
        "y", 
        Number(elts[1].getAttributeNS(null, "y"))+adjH);
      //update the text of the width indicators
      elts[1].textContent = formatSizeDisplay(Number(rect.getAttributeNS(null, "width"))/size);

      //update the position of the resizing triangle
      clickedGroup.getElementsByClassName("resize")[0].setAttributeNS(
        null, 
        "points",
        createTriPts(Number(rect.getAttributeNS(null, "x"))+newW, 
                     Number(rect.getAttributeNS(null, "y"))+newH));

      //the sizing clickPos x & y need to be continuously updated 
      //so that the size change is not cumulative
      clickPos.x = evt.clientX;
      clickPos.y = evt.clientY;
    }

    //MOVING
    else {
      moving = true;
      //do not allow moving elements beyond the screen area; 
      let newXPos = Number(clickedGroup.children[0].getAttributeNS(null, "x"))+coord.x-offset.x;
      let newYPos = Number(clickedGroup.children[0].getAttributeNS(null, "y"))+coord.y-offset.y;

      //check boundaries
      if (newXPos < 0 
          || newXPos + Number(clickedGroup.children[0].getAttributeNS(null, "width")) / size 
             > Number(svgPlace.getAttributeNS(null, "width"))
          || newYPos < 0
          || newYPos + Number(clickedGroup.children[0].getAttributeNS(null, "height")) / size 
             > Number(svgPlace.getAttributeNS(null, "height"))) {
        newXPos = 0;
        newYPos = 0;
//         touchUp(evt);
//         return;
      }
      
      transform.setTranslate(coord.x - offset.x, coord.y - offset.y);
//       console.log(`tx: ${coord.x - offset.x}, ty: ${coord.y - offset.y}`)
      //same as the line above
//       clickedGroup.transform.baseVal[0].setTranslate(coord.x - offset.x, coord.y - offset.y);
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////
//triggered by mouse or finger up, linked in html
function touchUp(evt) {
  
  if (evt.type.substring(0,5)==="touch"){
    mobile = true;
  }
  if (mobile) {
    if (evt.type.substring(0,5) === "mouse") {
      return;
    }
  }
  
  //record new plant or garden position in local storage if it's been moved
  if (clickedGroup && moving) {
    updateStoredData(clickedGroup.id, "tx", coord.x - offset.x);
    updateStoredData(clickedGroup.id, "ty", coord.y - offset.y);
  }

  //record new garden size in local storage when it's been resized
  if (clickedGroup && resize) {
    updateStoredData(
      clickedGroup.id, 
      "w", 
      Number(clickedGroup.getElementsByTagName("rect")[0].getAttributeNS(null, "width")));
    updateStoredData(
      clickedGroup.id, 
      "h", 
      Number(clickedGroup.getElementsByTagName("rect")[0].getAttributeNS(null, "height")));
  }

  //the following calls forks with different functionality garden tools or plant 
  //features for when a plant or garden has been tapped and there is no drag or 
  //resize, and it's not a double reaction to a click (either mouse or tap, not both)
  if (!moving && !resize && clickedGroup) {
    //if any part of the plant is clicked, call plantFrok, sending the clicked 
    //part as an argument; same for garden
    if (clickedGroup.classList.contains("plantGrp")){
      plantFork(evt.target);
    } 
    else if (clickedGroup.classList.contains("gardenGrp")){
      gardenFork(evt.target);
    }
  }

  //if moving a plant or a garden or resizing a garden, check if a plant and garden intersect
  if (resize && clickedGroup.id[0] === "g" || moving) {
    
    let grdns = localStorage.aas_myGardenVs_grdns;
    let plnts = localStorage.aas_myGardenVs_plnts;
    //first make sure both gardens and plants exist
    if (grdns && plnts) {
      //depending on which element is clicked check the intersection with the other one
      if (clickedGroup.id[0] === "g") {
        checkForIntersect(plnts.split(","), "plnt");
      } 
      else {
        checkForIntersect(grdns.split(","), "grdn");
      }
    }
  }
  
  moving = false;
  resize = false;
  clickedGroup = null;
}

//////////////////////////////////////////////////////////////////////
//when a plant or a garden is moved, this function is called to check
//if any of the plants are in any gardens; the check is performed by 
//comparing plants' and gardens' x & y positions adjusted by translate
//x & y, recorded in localStorage; 
//todo: the plant should "show" that it's been moved in or out of a garden by 
//toggling an outline (stroke) around the name
function checkForIntersect(counter, scrollThrough){
  
  //capture x, y, tx, ty, w, h specs for each element of the supplied counter
  //if the supplied counter is for gardens, the elt will contain garden specs
  //and the clickedGroup is a plant and vice versa
  let specs = {};
  counter.forEach(elt => {
    let ls = localStorage.getItem("aas_myGardenVs_"+scrollThrough+elt).split(",");
    specs[elt] = {      
      id:elt,
      x:Number(ls[0]), 
      y:Number(ls[1]), 
      w:Number(ls[2]), 
      h:Number(ls[3]), 
      tx:Number(ls[4]), 
      ty:Number(ls[5]),
      g:ls[7]
    }
  });
  
  //loop through specs' elements, captured from counter
  for (elt in specs) {
    let plant = null, garden = null;
    
    //a PLANT is moved around, check its intersection with gardens
    if (scrollThrough === "grdn") {
      plant = {
        x:Number(clickedGroup.children[0].getAttributeNS(null, "x")),
        y:Number(clickedGroup.children[0].getAttributeNS(null, "y")),
        tx:clickedGroup.transform.baseVal.getItem("translate").matrix.e,
        ty:clickedGroup.transform.baseVal.getItem("translate").matrix.f
      };
      garden = {
        x:specs[elt]["x"],
        y:specs[elt]["y"],
        tx:specs[elt]["tx"],
        ty:specs[elt]["ty"],
        w:specs[elt]["w"],
        h:specs[elt]["h"],
        id:"g_" + specs[elt]["id"]
      }
      
      //if a moved plant is already in a garden, remove 
      //parent's tx/ty to get plant's true coordinates
      if (clickedGroup.parentElement.id[0] === "g") {
        plant.tx += clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.e;
        plant.ty += clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.f;
      }

      //if a plant's location overlaps with a garden
      if (plantOverlapsGarden(plant, garden)){
        addPlantToGarden(clickedGroup, svgPlace.getElementById("g_"+elt));
        return;
      }
      //if a plant has been moved out of a garden and not placed into a new garden, 
      //meaning its gId is still equal to id of garden that it's not in, remove it
      else if (clickedGroup.parentElement.id === "g_"+elt) {
        removePlantFromGarden(clickedGroup, svgPlace.getElementById("g_"+elt));
      }
    }
    
    //a GARDEN is moved around - it moves the plants with it, so only need 
    //to check if a new plant has been added to a garden during the move or
    //if a garden has lost some plants during resizing
    else {
      plant = {
        x:specs[elt]["x"],
        y:specs[elt]["y"],
        tx:specs[elt]["tx"],
        ty:specs[elt]["ty"],
        gId:specs[elt]["g"]
      };
      garden = {
        x:Number(clickedGroup.children[0].getAttributeNS(null, "x")),
        y:Number(clickedGroup.children[0].getAttributeNS(null, "y")),
        tx:clickedGroup.transform.baseVal.getItem(0).matrix.e,
        ty:clickedGroup.transform.baseVal.getItem(0).matrix.f,
        w:Number(clickedGroup.children[0].getAttributeNS(null, "width")),
        h:Number(clickedGroup.children[0].getAttributeNS(null, "height"))
      }
      
      if (plant.gId[0] === "g") {
        plant.tx += garden.tx;
        plant.ty += garden.ty;
      }
      
      //if a garden(clickedGroup) is moved or resized to include a plant
      //(elt), that isn't already a part of a garden, add it to the garden
      if (plant.gId === "0" && plantOverlapsGarden(plant, garden)){
        addPlantToGarden(svgPlace.getElementById("p_"+elt), clickedGroup);
      }
      //otherwise, only when resizing, remove the plants that have been in the
      //garden, if they're being left out during resize; during moving, the
      //plants will remain in the garden; todo: alternatively, the plants 
      //could move up and to the left, and stay inside the garden
      else if (plant.gId === clickedGroup.id && resize && !plantOverlapsGarden(plant, garden)) {
        removePlantFromGarden(svgPlace.getElementById("p_"+elt), clickedGroup)
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////
function plantOverlapsGarden (plant, garden) {
  if(plant.x + plant.tx >= garden.x + garden.tx
     && plant.y + plant.ty >= garden.y + garden.ty
     && plant.x + plant.tx <= garden.x + garden.tx + garden.w
     && plant.y + plant.ty <= garden.y + garden.ty + garden.h)
  {return true;}
  else {return false;}
}

//////////////////////////////////////////////////////////////////////
//when a plant is moved into a garden, 
//its translate x/y are adjusted by garden's
function addPlantToGarden(plant, garden) {
  
  //if a plant is moved into garden, not within a garden
  if (plant.parentElement.id != garden.id) {
    //if a plant was previously in another garden, adjust tx/ty
    if (plant.parentElement.id[0]==="g") {
      plant.transform.baseVal.getItem("translate").setTranslate(
        plant.transform.baseVal.getItem("translate").matrix.e + 
          plant.parentElement.transform.baseVal.getItem("translate").matrix.e,
        plant.transform.baseVal.getItem("translate").matrix.f + 
          plant.parentElement.transform.baseVal.getItem("translate").matrix.f);
    }
    //remove the plant from its current parent
    plant.parentElement.removeChild(plant);
    
    //append to the new parent
    garden.appendChild(plant);
    
    //adjust plant's transform/translate values by garden's
    plant.transform.baseVal.getItem("translate").setTranslate(
      plant.transform.baseVal.getItem("translate").matrix.e - 
        garden.transform.baseVal.getItem("translate").matrix.e,
      plant.transform.baseVal.getItem("translate").matrix.f - 
        garden.transform.baseVal.getItem("translate").matrix.f);
    
    //add that garden's id to the plant's gId in localStorage
    updateStoredData(plant.id, "gardenId", garden.id);
    //update clicked plant's tx & ty in local storage
    updateStoredData(plant.id, "tx", plant.transform.baseVal.getItem("translate").matrix.e);
    updateStoredData(plant.id, "ty", plant.transform.baseVal.getItem("translate").matrix.f);
  }
}

//////////////////////////////////////////////////////////////////////
function removePlantFromGarden(plant, garden) {
  
  //remove the plant from the garden container and add back to svg
  garden.removeChild(plant);
  svgPlace.appendChild(plant);
  
  //update transform.translate back to exclude the garden's values
  plant.transform.baseVal.getItem("translate").setTranslate(
    (plant.transform.baseVal.getItem("translate").matrix.e 
     + garden.transform.baseVal.getItem("translate").matrix.e),
    (plant.transform.baseVal.getItem("translate").matrix.f 
     + garden.transform.baseVal.getItem("translate").matrix.f));
  //clear the garden's id from the plant's gId in localStorage
  updateStoredData(plant.id, "gardenId", 0);
  //update clicked plant's tx & ty in local storage
  updateStoredData(plant.id, "tx", plant.transform.baseVal.getItem("translate").matrix.e);
  updateStoredData(plant.id, "ty", plant.transform.baseVal.getItem("translate").matrix.f);
}

//////////////////////////////////////////////////////////////////////
//response to key up (escape and alike), this hides drop down menus
function tapClickKey(evt) {
  //garden name change is flagged on mouse/tap up; on key
  //up, name change is recorded in local storage, item 6
  if (evt.target.parentElement.classList.contains("editable")) {
    let gardenName = evt.target.value;
    if (gardenName.indexOf(", ") > -1) {
      //replace commas with double semi-columns so that it doesn't break split by comma
      gardenName = gardenName.replaceAll(",", ";;");
    }
    updateStoredData(evt.target.parentElement.parentElement.id, "name", gardenName);
  }
  
  if (evt.keyCode){
    //if return or escape are clicked
    if (evt.keyCode === 13 || evt.keyCode === 27){
      hideDropDown();
    }
    //if delete/backspace or clear are clicked todo:
    if (evt.keyCode === 8 || evt.keyCode === 12){
      hideDropDown(evt);
    }
  }
}

//////////////////////////////////////////////////////////////////////
//return the styling of garden name back to normal, when the user is done changing it
function focusOut(tgt) {
  if (tgt.parentElement.classList.contains("editable")) {
    tgt.style.fontSize = "14px";
  }
}


//////////////////////////////////////////////////////////////////////
//this function is triggered by double click, which is set in html SVG element
function dblTouch(evt, container) {
//   console.log(evt.type);
  hideDropDown();
  
  //if an editable name field is double-clicked on the garden, leave this module, 
  //cause it's just a name change not an intent to delete a garden
  if (evt.target.id != "svgArea"  
      && !evt.target.classList.contains("plant") 
      && !evt.target.classList.contains("plantLook") 
      && !evt.target.classList.contains("garden")) {
    return;
  }
  
  let mos = new Date;
  let vals = ["New\xa0Garden", "New\xa0Plant", 
              "Plant\xa0in\xa0" + "\uf060\xa0" + 
              mos.toLocaleString('default', {month:"short"}) + "\xa0\uf061"];
  if (localStorage.aas_myGardenVs_grdns){vals.push("Delete\xa0All\xa0Gardens")};
  if (localStorage.aas_myGardenVs_plnts){vals.push("Delete\xa0All\xa0Plants")};
  //if double clicked in SVG area display the add garden/plant menu
  if (evt.target.id === "svgArea") {
    let dropDownMenu = getUL(menu = {
      values:vals,
      xPos: (evt.pageX-5).toString()+"px",
      yPos: (evt.pageY-40).toString()+"px"
    });
    dropDownMenu.addEventListener("click", function() {
      addGardenPlantUL();
    });
    document.body.appendChild(dropDownMenu);
    return;
  }
    
  if (evt.target.parentElement.id[0] === "p") {
    if (!Number(localStorage.getItem("aas_myGardenVs_warnings"))) {
      if (!confirm("Would you like to remove " + evt.target.getAttributeNS(null, "desc") + "?")){
        return; 
      }    
    }
  }
  //if warnings are on, confirm that the garden needs to be removed
  else if (evt.target.parentElement.id[0] === "g") {
    if (evt.target.parentElement.id[0]==="g" &&
        !Number(localStorage.getItem("aas_myGardenVs_warnings"))) {
      if (!confirm("Would you like to remove " + 
                   evt.target.parentElement.getElementsByClassName("editable")[0].children[0].value + 
                   " and all its plants?")){
        return; 
      }
    }
  }
  
  del(evt.target.parentElement);
  
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////
//delete the supplied element from html and local storage
function del(elt) {
  //if the element is a garden with plants, remove the plants from local storage first
  if (elt.id[0] === "g") {
    let plants = elt.getElementsByTagName("g");
    for (let i = 0, len = plants.length; i < len; i++) {
      removeFromLocalStorage(plants[i].id);
    }
  }
  //next remove the element from html (if a garden, plants will be deleted as part of garden's group)
  elt.parentElement.removeChild(elt);
  //finally, remove the element from local storage
  removeFromLocalStorage(elt.id);
}

//////////////////////////////////////////////////////////////////////
//this function deletes a garden or plant from local storage using  
//supplied pGrp (plnt or grdn) and the numeruc id (pId)
function removeFromLocalStorage(fullId) {
  
  //capture the plant or garden string part in a variable
  let p_g = null;
  fullId.split("_")[0]==="p"?p_g = "plnt":p_g = "grdn"

  //capture the numeric part of id in a variable
  let idNum = fullId.split("_")[1];
  
  localStorage.removeItem("aas_myGardenVs_"+p_g+idNum);
  //update the plant counter array
  let cntr = localStorage.getItem("aas_myGardenVs_"+p_g+"s");
  if(cntr){
    cntr = cntr.split(",");
    if(cntr.length > 1){
      if (cntr.indexOf(idNum) > -1){
        cntr.splice(cntr.indexOf(idNum), 1);
      }
      localStorage.setItem("aas_myGardenVs_"+p_g+"s", cntr);
    } else {
      localStorage.removeItem("aas_myGardenVs_"+p_g+"s");
    }
  }
}

//////////////////////////////////////////////////////////////////////
//this function updates the localStorage plant or garden data based on
//the id supplied in chgId with the value val at index position ind
function updateStoredData(chgId, field, val){
  // data is stored in localStorage in the following order (indeces)
  // 0 = x
  // 1 = y
  // 2 = w, width
  // 3 = h, height
  // 4 = tx, translate by x
  // 5 = ty, translate by y
  // 6 = nm, name
  // 7 = sun for a garden, garden group id for a plant
  // 8 = soil selected for the garden, lnm, latin name for a plant
  // 9 = display value of image and plant shape:
  // 10 = color selected for the plant

  //ind is the position of the data fields in the localStorage string
  let ind = null;
  
  switch (field) {
    case "x":
      ind = 0;
      break;
    case "y":
      ind = 1;
      break;
    case "w":
      ind = 2; //width
      break;
    case "h":
      ind = 3; //height
      break;
    case "tx":
      ind = 4; //translate by x
      break;
    case "ty":
      ind = 5; //translate by y
      break;
    case "name":
      ind = 6; //garden or plant name
      break;
    case "sun":
    case "gardenId":
      ind = 7; //sun for a garden or garden group id for a plant
      break;
    case "latinName":
    case "soil":
      ind = 8; //soil for garden or latin name for plant
      break;
    case "display":
      //display value of plant's image and size:
        // 0 - photo is not available, size is hidden
        // 1 - photo is available, it and size are hidden
        // 2 - photo is not available, size is shown
        // 3 - photo is available, it and size are shown
      ind = 9;
      break;
    case "color":
      ind = 10;
      break;
               }
  
  var currData, idPrefix;
  if (chgId.toString()[0]==="p"){
    idPrefix = "plnt";
  } else {
    idPrefix = "grdn";
  }
  //get the numeric part of the id, which starts at index 2, 
  //as all ids are prefixed with p or g followed by an underscore
  //substring extracts between start and end; 
  chgId = chgId.slice(2);
  currData = localStorage.getItem("aas_myGardenVs_"+idPrefix+chgId).split(",");
  currData[ind] = val;
  localStorage.setItem("aas_myGardenVs_"+idPrefix+chgId, currData);
}

//////////////////////////////////////////////////////////////////////
function hideDropDown() {
  //check if there is already a dropDown menu and remove it
  //there should not be more than one dropDown menu at a time
  //the dropDown class  is applied to settings, 
  //add garden/plant, and add a plant UL menus
  let dropMenus = document.getElementsByClassName("dropDown");
  if (dropMenus[0]) {
    dropMenus[0].remove();
  }
  //check and hide plant info boxes:
  let plantData = ["fauxLi", "plantInfo"];
  for (var p = 0, len=plantData.length; p < len; p++) {
    let plantInfoBoxes = document.getElementsByClassName(plantData[p]);
    let l = plantInfoBoxes.length;
    if (l) {
      for (var i = 0; i < l; i++) {
        plantInfoBoxes[0].remove();
      }   
    }
  }
}

//////////////////////////////////////////////////////////////////////
// When the user clicks on the button, scroll to the top of the document
function goUp() {
  document.body.scrollTop = 0; // For Safari
  document.body.scrollLeft = 0;
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
  document.documentElement.scrollLeft = 0;
}
