/*****************************************************************
   Important:
   Ids are created for each plant's and garden's groups and
   are prefixed with p_ for plants, with g_ for gardens;
******************************************************************/
//     global variables
const xmlns = "http://www.w3.org/2000/svg";
var svgPlace = null;
const size = 6; //size variable is used in garden & plant size calculations
const mos = [ "Jan","Feb","Mar","Apr","May","Jun", "Jul","Aug","Sep","Oct","Nov","Dec" ];
const winterMos = [ "Jan", "Feb", "Oct", "Nov", "Dec" ];
var currMonth = null;

//      moving and resizing
var clickedGroup = null;
var coord = null; //coordinate of touch/click adjusted by CTM
var offset = null; //coord adjusted by transform/translate; double purple - this is set to 1 in touchDown() when clicked on an element that shouldn't be dragged
var transform = null; //item 0 (set to translate) of clickedGroup's transforms
var resize = null; //1: horizontal, 2: vertical, 3: both;
var moving = false;
var clickPos = {}; //stores cursor location upon first click
var munit = 0;
var isMobile = false;

//////////////////////////////////////////////////////////////////////
//this function is called on window load and loads existing garden design from user's local storage
function myMain() {
  isMobile =  window.matchMedia("only screen and (max-width: 600px)").matches;

  svgPlace = document.getElementById("svgArea");
  let zoomIn = 2;
  let zoomer = parseInt(localStorage.getItem("zoomer"), 10) || 2;
  svgPlace.setAttribute("width", window.screen.width * zoomIn); // zoom in
  svgPlace.setAttribute("height", window.screen.height * zoomIn);
  svgPlace.viewBox.baseVal.x = 0;
  svgPlace.viewBox.baseVal.y = 0;
  svgPlace.viewBox.baseVal.width = window.screen.width * zoomer; // use twice or 2.5 the screen width
  svgPlace.viewBox.baseVal.height = window.screen.height * zoomer;

  // munit = my unit, about a half of the font size
  munit = Math.round((parseInt(window.getComputedStyle(svgPlace, null)
    .getPropertyValue("font-size"),10)/2 + Number.EPSILON) * 100) / 100;

  // add linear gradients for each sun/soil combination, stored in an array
  const sunColors = {"Full":["#ffe922", "50%"], "Part":["#ddcc38", "30%"], "Shade":["#bfba71", "30%"]};
  const soilColors = {"Acidic":"rgb(160, 195, 68)", "Neutral":"rgb(166, 146, 62)", "Alkaline":"rgb(4, 56, 111)"};

  for (let sun in sunColors) {
    for (let soil in soilColors) {
      addGradient ({
        tp: "linear",
        id: sun + "_" + soil,
        stops: {
          "0%":[sunColors[sun][0],"0.8"],
          [sunColors[sun][1]]:["#d1e0e0","0.3"],
          "90%":["#d1e0e0","0.8"],
          "97%":[soilColors[soil],"0.8"]}
      });
    }
  }

  addGradient({
    tp: "radial",
    id: "green"
  });

  // display current month
  currMonth = new Date().getMonth();
  document.getElementById("currentMonth").innerText = mos[currMonth];

  // check if localStorage is available and load the existing design, if there is one
  if (checkLocalStorage()) {
    loadExistingDesign();
  }

  // if mobile, add a little dot in the top left corner
  if (isMobile) {
    const orientir = document.createElement("div");
    orientir.className = "orientir";
    document.body.insertBefore(orientir, document.querySelector("#svgPlace"));
  }
}

//////////////////////////////////////////////////////////////////////
// create linear gradients for the gardens
function addGradient(specs) {
  const grad = document.createElementNS(xmlns,`${specs.tp}Gradient`);
  grad.setAttribute('id', camelCase(specs.id));

  grad.setAttribute('x1', "50%");
  grad.setAttribute('x2', "50%");
  grad.setAttribute('y1', "0%");
  grad.setAttribute('y2', "100%");

  for (x in specs.stops) {
    const stop = document.createElementNS(xmlns ,'stop');
    stop.setAttribute("offset", x);
    stop.setAttribute("stop-color", specs.stops[x][0]);
    stop.setAttribute("stop-opacity", specs.stops[x][1]);
    grad.appendChild(stop);
  }
  const defs = svgPlace.querySelector('defs') || svgPlace.insertBefore(document.createElementNS(xmlns,'defs'), svgPlace.firstChild);
  defs.appendChild(grad);
}

//////////////////////////////////////////////////////////////////////
// check if local storage functionality is available to the user
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
// pull previously designed gardens and plants and recreate them
function loadExistingDesign() {
  // capture the number of gardens created
  let gardens =  localStorage.aas_myGardenVs_grdns;
  if (gardens) {
    gardens = gardens.split(",");
    for (let i = 0, l = gardens.length; i < l; i++){
      // pull gardens counter from local storage
      let garden = localStorage.getItem("aas_myGardenVs_grdn"+gardens[i].toString());
      // recreate gardens based on the counter and
      // stored garden id, x, y, w, h, nm (name), sn (sun), sl (soil)
      if (garden) {
        garden = garden.split(",");
        addGarden({
          gId: gardens[i],
          x: Number(garden[0]),
          y: Number(garden[1]),
          w: Number(garden[2]),
          h: Number(garden[3]),
          nm: garden[4].replaceAll(";;",","),
          sn: garden[5],
          sl: garden[6]
        });
      }
    }
  }
  // capture the number of plants created
  let plants = localStorage.aas_myGardenVs_plnts;
  if (plants){
    plants = plants.split(",");
    for (let i = 0, l = plants.length; i < l; i++){
      let plant = localStorage.getItem("aas_myGardenVs_plnt"+plants[i]);
      if (plant) {
        plant = plant.split(",");
        // recreate each plant using stored values
        addPlant({
          pId: plants[i],
          x: Number(plant[0]),
          y: Number(plant[1]),
          w: Number(plant[2]),
          h: Number(plant[3]),
          nm: plant[4],  // plant name
          gId: plant[5], // garden that the plant belons to, if any
          lnm: plant[6], // latin name
          shp: plant[7], // shape: tree, flower, bush, etc. & the leafiness
          clr: plant[8], // camelCased, user choice or 1st available
          blm: plant[9]  // array of in-bloom month numbers
        });
      }
    }
  }
  if (!gardens && !plants && localStorage.aas_myGardenVs_warnings === "0"
    && localStorage.aas_myGardenVs_units === "0" && localStorage.aas_myGardenVs_zoomer === "2") {
    const initText = document.createElement("div");
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
    closeButton.classList.add("btnHelper");
    closeButton.classList.add("btnClose");
    closeButton.addEventListener("click", function(evt) {
      document.body.removeChild(evt.target.parentElement);
    });
    initText.appendChild(closeButton);
    document.body.appendChild(initText);
  }
}

//////////////////////////////////////////////////////////////////////
// change the garden look according to the selected month
function changeMonth(tgt) {
  if(tgt.id === "currentMonth") {
    const monthMenu = getUL({values: mos});
    monthMenu.id = "monthMenu";
    tgt.appendChild(monthMenu);
  } else {
    let lsPlants = localStorage.aas_myGardenVs_plnts;
    if(lsPlants) {
      lsPlants = lsPlants.split(",");
      // update header
      tgt.parentElement.parentElement.innerText = tgt.innerText; // here
      currMonth = mos.indexOf(tgt.innerText);

      for(let i = 0, l = lsPlants.length; i < l; i++) {
        let lsPlant = localStorage.getItem("aas_myGardenVs_plnt" + lsPlants[i]);
        if(lsPlant) {
          lsPlant = lsPlant.split(",");

          // get the lsPlant element
          const plantElt = document.getElementById("p_" + lsPlants[i]);
          // if blooms in current month:
          if(lsPlant[9].split(';').includes(mos.indexOf(tgt.innerText).toString())) {
            colorPlant(plantElt.children[0], plantElt.id, lsPlant[8]);
          } else {
            plantElt.children[0].style.textShadow = "none";
            plantElt.children[0].style.stroke = "none";
          }
          // if evergreen or non-winter month, an annual would have "a"
          if(lsPlant[7][1] === "e" || !winterMos.includes(tgt.innerText)) {
            plantElt.children[0].style.fill = "green";
          } else {
            plantElt.children[0].style.fill = "var(--plant-text-color)";
          }
        }
      }
    }
    changeMonth(document.getElementById("currentMonth"));
  }
}

//////////////////////////////////////////////////////////////////////
// settings menu drop down, called by clicking on settings button
function settingsMenu(clickedElt) {

  // if a cog icon is clicked, set the clicked element clickedElt to its parent
  if (clickedElt.className === "fa fa-fw fa-cog") {
    clickedElt = clickedElt.parentElement;
  }
  else if (clickedElt.className === "customChoice") {
    switch (clickedElt.innerText) {
      case "Warnings - on":
        localStorage.setItem("aas_myGardenVs_warnings", 1);
        clickedElt.innerText = "Warnings - off";
        return;
			case "Warnings - off":
        localStorage.setItem("aas_myGardenVs_warnings", 0);
        clickedElt.innerText = "Warnings - on";
        return;
      case "Units - in":
        localStorage.setItem("aas_myGardenVs_units", 1);
        clickedElt.innerText = "Units - cm";
        toggleCmIn("cm");
        return;
      case "Units - cm":
        localStorage.setItem("aas_myGardenVs_units", 0);
        clickedElt.innerText = "Unit - in";
        toggleCmIn("in");
        return;
      case "Zoom - out":
        zoomer = 4;
        localStorage.setItem("aas_myGardenVs_zoomer", zoomer);
        clickedElt.innerText = "Zoom - in";
        svgPlace.viewBox.baseVal.width = window.screen.width * zoomer;
        svgPlace.viewBox.baseVal.height = window.screen.height * zoomer;
        return;
      case "Zoom - in":
        zoomer = 2;
        localStorage.setItem("aas_myGardenVs_zoomer", zoomer);
        clickedElt.innerText = "Zoom- out";
        svgPlace.viewBox.baseVal.width = window.screen.width * zoomer;
        svgPlace.viewBox.baseVal.height = window.screen.height * zoomer;
        return;
      case "Export a garden":
        let garden_data = "";
        for (const [key, value] of Object.entries(localStorage)) {
          if (key.slice(0,14)==="aas_myGardenVs") garden_data += (key + ": " + value);
        }
        const file = new Blob([garden_data], {type: "txt"});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
          window.navigator.msSaveOrOpenBlob(file, filename);
        else {
          const doc = document.createElement("a"), url = URL.createObjectURL(file);
          doc.href = url;
          doc.download = "GardenDesign";
          document.body.appendChild(doc);
          doc.click();
          setTimeout(function() {
              document.body.removeChild(doc);
              window.URL.revokeObjectURL(url);
          }, 0);
        }
        break;
      case "Import a garden":
      default:
        alert("this is yet to come");
        console.log("new change requested");
        return;
      }
  }

  // if the button already has a dropdown menu it has
  // more than one child (icon), remove the menu
  if (clickedElt.childElementCount > 1) {
    clickedElt.removeChild(clickedElt.children[1]);
  }
  // else, create the settings menu
  else {
    let warningsSetting = Number(localStorage.getItem("aas_myGardenVs_warnings")) ? "off" : "on";
    // Units: 0 - inches/feet; 1 - cm/m;
    let unitSetting = Number(localStorage.getItem("aas_myGardenVs_units")) ? "cm" : "in";
    // Zoomed in setting is 2, default; zoomed out is currently at 4, unless I change my mind
    let zoomValue = localStorage.getItem("aas_myGardenVs_zoomer") === "4" ? "in" : "out";
    clickedElt.appendChild(
      getUL (
        {values:[`Warnings - ${warningsSetting}`, `Units - ${unitSetting}`, `Zoom - ${zoomValue}`, "Export a garden", "Import a garden"],
         // the below are x and y positions of the clicked settings buttom
         xPos: (clickedElt.clientWidth+5),
         yPos: (clickedElt.clientHeight-25)})
    );
  }
}

//////////////////////////////////////////////////////////////////////
// fast scroll to the plant that starts with a clicked letter
function scrollToLetter(e) {
  const uList = document.getElementsByTagName("ul")[0];
  if (!uList) return;
  const letter = isNaN(e) ? e.innerText : String.fromCharCode(e);
  const lItem = uList.getElementsByClassName(letter)[0];
  if (lItem) uList.scrollTop = lItem.offsetTop - 1;
}

//////////////////////////////////////////////////////////////////////
// extract avg height and width, inches to pixels ratio 1:1
function getAvgNum(origVal) {
  // map performs an action on each element of an array,
  // reduce operates on all the elements
  let inchVal = origVal.match(/\d+(''|")/g);
  // RegEx: to get feet: digit followed by quote that's not followed by anouther quote
  let footVal = origVal.match(/\d+'(?!')/g);
  let finalExtracted = [0];
  if (inchVal && footVal){finalExtracted = inchVal.map(x=>parseFloat(x)).concat(footVal.map(x=>parseFloat(x)*12));}
  else if (inchVal) {finalExtracted = inchVal.map(x=>parseFloat(x));}
  else if (footVal) {finalExtracted = footVal.map(x=>parseFloat(x)*12);}
  finalExtracted = finalExtracted.reduce((a,b)=>(a+b))/finalExtracted.length.toString();
// finalExtracted === 0?finalExtracted=1:finalExtracted; //todo: plants without width and height?
	return finalExtracted;
}

/**
 * @param {object} menu object has xPos, yPos, type, [gId], [values]
 * @returns UL drop down menu with the values either supplied in
 * the menu parameter or pulled from plants json file
 */
function getUL(menu) {

  // hide any showing menus; when the 'add new plant' choice is clicked, don't hide drop down menus
  hideDropDown();

  // the newLetter is used for adding scroll to points in the add plant menu
  let newLetter = null;
  let letters = [];

  const dropMenu = document.createElement("ul");
  dropMenu.className = "dropDown";
  dropMenu.style.left = menu.xPos + "px";
  dropMenu.style.top = menu.yPos + "px";

  const alphaMenu = document.createElement("ul");
  const zetaMenu = document.createElement("ul");

  // this inner function adds supplied values to supplied UL
  function populateList(vals, toMenu) {
    for (let i = 0, l = vals.length; i < l; i++){
      const liText = document.createElement("li");
      liText.className = "customChoice";
      if (!letters.includes(vals[i]) && toMenu.classList.contains("alphabet"))
        { liText.classList.add("disabledCustomChoice"); }
      liText.innerHTML = vals[i];
      toMenu.appendChild(liText);
    }
  }

  // this inner function filters all plants down to just the selected group
  function filterByGroup(tgt) {

    if (tgt.tagName != "LI") return;

    // color all choices grey, then uncolor the selected; done via class
    tgt.parentElement.childNodes.forEach(x => {
      (x === tgt || tgt.textContent === "all") ? x.classList.remove('disabledCustomChoice') : x.classList.add('disabledCustomChoice')
    });

    for (let i = 0, len = dropMenu.childElementCount; i < len; i++) {
      let compVal = dropMenu.children[i].getAttribute("title").split(",")[0];
      // group the plans into generic groups
      switch (compVal) {
        case 'brush':
        case 'grass':
        case 'shrub':
          compVal = 'bush';
          break;
        case 'berry':
        case 'veg':
        case 'herb':
          compVal = "edible";
          break;
        case 'flower':
        case 'groundcover':
        case 'vine':
          compVal = 'flower';
          break;
        }
      // hide or display the menu
      if (tgt.textContent === compVal || tgt.textContent === "all") {
        dropMenu.children[i].style.display = "block";
      } else {
        dropMenu.children[i].style.display = "none";
      }
    }
    // letter shortcut menus are faded for all menus except "all"
    if (tgt.textContent != "all") {
      alphaMenu.style.opacity = "0.1";
      zetaMenu.style.opacity = "0.1";
    } else {
      alphaMenu.style.opacity = "1";
      zetaMenu.style.opacity = "1";
    }
  }

  // if menu values are supplied, add them to the menu
  if (menu.values) {
    populateList(menu.values, dropMenu);
  }
  // otherwise, retrieve the data from the plants.json file, shared with db tab & ls
  else {
    fetch('plants.json')
      .then((res) => {
        return(res.json());
      })
      .then((myObj) => {
        // if there are plants added by user in db, append those to the list of plants
        // if plant counter exists in local storage...
        const plantCounter = localStorage.getItem("gDb_rPlntsCntr");
        if (plantCounter) {
          for (let i = 0, len = plantCounter.length; i < len; i++) {
            arrPlntVals = JSON.parse(localStorage.getItem("gDb_plnt"+i))
            myObj[arrPlntVals[0]] = arrPlntVals.slice(1);
          }
        }
        // also remove the first entry in myObj, as those are unneeded column headers
        delete myObj["Latin&nbspName"];

        // the returned plants are filtered, if requested
        if (menu.type === "companions") {
          menu.filter = myObj[menu.forPlantLN][16].toLowerCase().replaceAll(" ","").split(",").filter(x => !["/and","/or"].includes(x))
        }
        if (menu.type === "gName") {
          let objGardenLocation = null;
          if (localStorage.gDb_GardenLocation) {
            objGardenLocation = JSON.parse(localStorage.gDb_GardenLocation);
          }
          let newFilters = [];
          for (p in objGardenLocation) {
            if (objGardenLocation[p].toLowerCase().indexOf(menu.filter) > -1) {
              newFilters.push(p);
            }
          }
          menu.filter = newFilters;
        }

        // if no plants exist for a chosen criteria, such as garden name, etc.
        if (!["all", "companions"].includes(menu.type) && (menu.filter === ", " || !menu.filter.length)) {
          const liText = document.createElement("li");
          liText.textContent = "There are no recorded plants that match this criteria.";
          dropMenu.appendChild(liText);
        }
        else {
          // add an option to create all filtered plants; if type is all then don't need this option, as that would be too many
          if (menu.type != "all") {
            const liText = document.createElement("li");
            liText.className = "customChoice plant";
            liText.textContent = "Add All Plants";
            dropMenu.appendChild(liText);
          }
          // add filtered plant names to the menu
          for (x in myObj) {
            if (menu.type === "all"
                // if a plant name (0) is in the list of plantFilters, add it as a companion plant
                || menu.type === "companions" && menu.filter.includes(myObj[x][0].toLowerCase())
                // if the plant, for which companions are pulled is itself a companion for a plant (myObj[x]) and hasn't been added to menu filter yet, add it
                || (menu.type === "companions" &&
                    myObj[x][16].includes(menu.forPlantCN) &&
                    !(menu.filter.includes(myObj[x][1])))
                // if the month matches
                || menu.type === "timeToPlant" && myObj[x][19].toLowerCase().indexOf(menu.filter) > -1
                // if the name of current garden is local storage
                || menu.type === "gName" && menu.filter.includes(x)
                || menu.type === "sunSoil"
                  && myObj[x][10].toLowerCase().indexOf(menu.filter[0]) > -1
                  && myObj[x][18].toLowerCase().indexOf(menu.filter[1]) > -1
               )
            {
              const liText = document.createElement("li");
              liText.className = "customChoice plantName";
              // need common(2) and latin(1) names, class(3), height(4), width(5), sun(10), image(29)
              liText.title = myObj[x][3]+", sun: "+myObj[x][10];
              liText.innerHTML = myObj[x][0];
              liText.setAttribute("data-lnm", x);
              // extract average height and width
              liText.setAttribute("data-avgh",getAvgNum(myObj[x][4]));
              liText.setAttribute("data-avgw",getAvgNum(myObj[x][5]));

              // capture the first letters of plant type
              let shp = ["flower","tree","vine"].includes(myObj[x][3]) ?
                myObj[x][3][0] : "b";

              // capture the leafyness
//               if (myObj[x][7].includes("semi-evergreen")) {
//                 shp += "s"
//               } else //semi-evergreen is rolled into evergreen for now
                if (myObj[x][7].includes("evergreen")) {
                shp += "e"
              } else if (myObj[x][7].includes("perennial")) {
                shp += "p"
              } else if (myObj[x][7].includes("biennial")) {
                shp += "b"
              } else if (myObj[x][7].includes("annual")) {
                shp += "a"
              } else if (myObj[x][7].includes("deciduous")) {
                shp += "d"
              } else {
                shp += "o"
              }

              liText.setAttribute( "data-shp", shp);

              // capture the bloom months, separated by semicolon instead of a comma to keep them together when reading from local storage;
              liText.setAttribute(
                "data-bloomM",
                myObj[x][8].split(',').map(
                  x => mos.includes(x.trim())?mos.indexOf(x.trim()):" ")
                .join(";")
              );

              // capture the first bloom color;
              liText.setAttribute(
                "data-bloomC",
                myObj[x][1].includes("inconspicuous")||myObj[x][6].includes("inconspicuous") ?
                "i_" + camelCase(myObj[x][6].replace(/inconspicuous|;/g,"").split(",")[0]):
                camelCase(myObj[x][6].split(",")[0]));

              if (menu.type === "all") {
                // add a class to the first occurence of every letter for scrolling shortcuts
                if ( !newLetter || myObj[x][0].charAt(0) > newLetter ) {
                  newLetter = myObj[x][0].charAt(0);
                  liText.classList.add(myObj[x][0].charAt(0));
                  // record existing letters so that nonexisting first letters can be colored gray
                  letters.push(myObj[x][0].charAt(0));
                }
              }
              dropMenu.appendChild(liText);
            }
          }
          if (dropMenu.childElementCount === 1 &&
              dropMenu.children[0].innerText === "Add All Plants") {
            dropMenu.children[0].innerText = "There are no recorded plants that match this criteria.";
          }

          // add class filtering menus when all plants are shown in the menu
          if (menu.type === "all") {
            if (isMobile) {
              //A-M shortcuts on the left
              alphaMenu.style.left = parseInt(menu.xPos)-36+"px";
              alphaMenu.style.top = menu.yPos+"px";
              alphaMenu.className = 'alpha alphabet dropDown';
              populateList('ABCDEFGHIJKLM'.split(''), alphaMenu);
              alphaMenu.addEventListener("click", (evt) => {
                scrollToLetter(evt.target);
              });
              document.body.appendChild(alphaMenu);

              // N-Z shortcuts on the right
              zetaMenu.style.left = parseInt(menu.xPos)+168+"px";
              zetaMenu.style.top = menu.yPos+"px";
              zetaMenu.className = 'zeta alphabet dropDown';
              populateList('NOPQRSTUVWXYZ'.split(''), zetaMenu);
              zetaMenu.addEventListener("click", (evt) => {
                scrollToLetter(evt.target);
              });
              document.body.appendChild(zetaMenu);
            }
            // plant class filtering buttons right above the menu
            const classMenu = document.createElement('ul');
            classMenu.style.left = isMobile ? parseInt(menu.xPos)-36+"px" : parseInt(menu.xPos)-3+"px";
            classMenu.style.top = parseInt(menu.yPos)+326+"px";
            classMenu.className = 'plantCls dropDown';
            populateList(['all','bush','edible','flower','tree'], classMenu);
            classMenu.addEventListener("click", (evt) => {
              filterByGroup(evt.target);
            });
            document.body.appendChild(classMenu);
          }
        }
      })
    .catch((err) => {
      console.log("Unable to get plants data to populate the list of available plants.");
    });
  }

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
// function to make a UL, adding onclick functionality to each LI
function addPlantMenu(menu) {

  // call a function to create UL with plants at the position of a click
  const dropDownMenu = getUL(menu);

  // assign an onclick response that adds a plant(s)
  dropDownMenu.addEventListener("click", function(evt) {

    // make sure the click is on a custom choice (inside a menu)
    if (!evt.target.classList.contains("customChoice")) {
      return;
    }

    // capture plant li elements from the menu into an array so that their properties can be accessed
    const ar = Array.from(evt.target.parentElement.getElementsByTagName("li"));

    // when adding plants to a garden, x-offset is calculated for each height group;
    // the following determines how many plants fall into each height group, then the width is divided by the number of plants to calculate the available horizontal space between plants
    const xSp1 = menu.gW / (ar.filter(x => rangeCheck(x.getAttribute("data-avgh"),0,24)).length);
    const xSp2 = menu.gW / (ar.filter(x => rangeCheck(x.getAttribute("data-avgh"),24,48)).length);
    const xSp3 = menu.gW / (ar.filter(x => rangeCheck(x.getAttribute("data-avgh"),48,72)).length);
    const xSp4 = menu.gW / (ar.filter(x => Number(x.getAttribute("data-avgh")) >= 72).length);

    // the x1 through x4 is for current plant's offset
    let x1 = x2 = x3 = x4 = 0;

    /* loop through filtered plants and add them;
    when adding to garden, the plant is centered within the garden;
    otherwise, it's placed to the left of menu;
    if the menu was brought up too close to the left edge of the screen,
    the plant is placed to the right;
    vertically, the plant is at the position of its listing in the menu
    unless 'Add All Plants' option is clicked, add 1 plant
    because liCnt includes the 'Add All Plants' option,
    the itiration starts at 1, thus set liCnt to 2 for a sinlge addition */
    const liCnt = evt.target.innerText === "Add All Plants" ? ar.length : 2;
    for (let i = 1; i < liCnt; i++) {
      // the x and y offsets for plants added to a garden or freestanding
      let xOffset = yOffset = 0;

      // for plants added to a garden
      if (menu.gId) {
        // if adding all plants to a garden, space them at the intervals calculated below
        if (evt.target.innerText === "Add All Plants") {
          // using garden height, gH, calculate the desired vertical spacing of plant groups; horizontally, plants are placed at xOffset intervals
          yOffset = menu.gH / 3; //3 spaces between 4 groups
          if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 24) {
            // the shortest plants go to the front (bottom), thus the biggest offset
            yOffset *= 2;
            xOffset = menu.gX + x1 * xSp1;
            x1++;
          } else if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 48) {
            yOffset *= 1.5;
            xOffset = menu.gX + x2 * xSp2;
            x2++;
          } else if (Number(evt.target.parentElement.children[i].getAttribute("data-avgh")) < 72) {
            xOffset = menu.gX + x3 * xSp3;
            x3++;
          } else {
            yOffset *= 0.5;
            xOffset = menu.gX + x4 * xSp4;
            x4++;
          }
          yOffset = menu.gY + yOffset;

          // alternate vertical position slightly
          if (i%2) yOffset += munit*2;

        }
        else {
          xOffset = menu.gX + menu.gW/2;
          yOffset = menu.gY + menu.gH/2;
        }
      }

      // for freestanding plants
      else {
        // Y-OFFSET: when adding all plants, space them vertically 16px apart; otherwise, the vertical placing is at the location of the name in the list;
        yOffset = evt.target.innerText === "Add All Plants" ?
          parseInt(window.getComputedStyle(evt.target.parentElement).top) + 16 * i :
          evt.pageY;
        // X-OFFSET: if the menu is too close (within 150px) to the left edge of the screen, add the plant on the right, otherwise - left
//         todo: check if the x-calculation creates a result that's too long
        if (parseInt(evt.target.parentElement.style.left) < 150) {
          // xOffset needs to include the alphabet shortcuts that all plants have on the sides
          xOffset = menu.type === "all"
            ? parseInt(evt.target.parentElement.nextSibling.nextSibling.style.left) + munit * 5
            : parseInt(evt.target.parentElement.style.left) + parseInt(window.getComputedStyle(evt.target.parentElement).width) + munit * 3;
        } else {
          xOffset = menu.type === "all"
            ? parseInt(evt.target.parentElement.nextSibling.style.left) - parseInt(window.getComputedStyle(evt.target.parentElement).width) * 0.7
            : parseInt(evt.target.parentElement.style.left) - parseInt(window.getComputedStyle(evt.target.parentElement).width) * 0.7;
        }
      }

      const plantLi = evt.target.innerText != "Add All Plants" ? evt.target : evt.target.parentElement.children[i];
      addPlant({
        pId: null, // plant id is set to null, when creating a new plant
        x: parseFloat(xOffset),
        y: parseFloat(yOffset),
        w: Number(plantLi.getAttribute("data-avgw")),
        h: Number(plantLi.getAttribute("data-avgh")),
        nm: plantLi.innerText, // plant's common name
        gId: menu.gId?menu.gId:0, // a garden id, where the new plant is planted, 0 at first
        lnm: plantLi.getAttribute("data-lnm"), // plant's latin name
        shp: plantLi.getAttribute("data-shp"),
        clr: plantLi.getAttribute("data-bloomC"),
        blm: plantLi.getAttribute("data-bloomM")
      });
    }
  });

  //the menu with event listeners have been created, now the menu is added to the document's body, not svg
  document.body.appendChild(dropDownMenu);
}

//////////////////////////////////////////////////////////////////////
//this function is activated when a user selects a garden or
//plant from the 'add a garden or a plant' drop down menu;
function addGardenPlantUL() {
  const clickedElt = event.target;

  // if clicked on a garden option of dropdown menu
  if (clickedElt.innerText === "New\xa0Garden") {
    hideDropDown();
    addGarden({
      gId:null,
      x:Math.min(svgPlace.getAttribute("width"), Math.max(0, parseFloat(event.target.parentElement.style.left))),
      y:Math.min(svgPlace.getAttribute("height"), Math.max(0, parseFloat(event.target.parentElement.style.top))),
      w:240,
      h:120,
      nm:"New Garden",
      sn:"\uf185", // setting SUN value for a new garden to a sun icon
      sl:"Soil"
    });
  }

  // if clicked on a 'New Plant' choice in the dropdown menu
  else if (clickedElt.innerText === "New\xa0Plant") {
    addPlantMenu({
      xPos: parseFloat(clickedElt.parentElement.style.left),
      yPos: parseFloat(clickedElt.parentElement.style.top),
      type: "all"
    });
  }

  // if clicked on a "Plant in MMM" choice of dropdown menu
  else if (clickedElt.innerText.slice(0,8) === "Plant\xa0in") {
    addPlantMenu({
      xPos: parseFloat(clickedElt.parentElement.style.left),
      yPos: parseFloat(clickedElt.parentElement.style.top),
      type: "timeToPlant",
      filter: clickedElt.innerText.split("\xa0")[3].toLowerCase()
    });
  }

  // if clicked on the left arrow of the "Plant in MMM" choice of dropdown menu
  else if (clickedElt.innerText.trim()=== "<-") {
    clickedElt.parentElement.innerHTML = clickedElt.parentElement.innerText.split("-")[1].trim()==="Jan"?
    clickedElt.parentElement.innerHTML.replace(/<\/span>\w\w\w<span>/, "</span>Dec<span>"):
    clickedElt.parentElement.innerHTML.replace(/<\/span>\w\w\w<span>/, "</span>" + mos[mos.indexOf(clickedElt.parentElement.innerText.split("-")[1].trim())-1] + "<span>");
  }
  // if clicked on the right arrow of the "Plant in MMM" choice of dropdown menu
  else if (clickedElt.innerText.trim() === "->") {
    clickedElt.parentElement.innerHTML = clickedElt.parentElement.innerText.split("-")[1].trim()==="Dec"?
    clickedElt.parentElement.innerHTML.replace(/<\/span>\w\w\w<span>/, "</span>Jan<span>"):
    clickedElt.parentElement.innerHTML.replace(/<\/span>\w\w\w<span>/, "</span>" + mos[mos.indexOf(clickedElt.parentElement.innerText.split("-")[1].trim())+1] + "<span>");
  }

  // if a Delete All Plants or Delete All Gardens options are clicked
  else if (clickedElt.innerText.slice(0,6) === "Delete") {

    // confirm the removal of all plants or gardens
    if (localStorage.aas_myGardenVs_warnings && !(Number(localStorage.aas_myGardenVs_warnings)))
    {
      if (!confirm(`Would you like to ${clickedElt.innerText}?`)){
        return;
      }
    }

    // capture plnts or grnds in a variable, based on a choice clicked
    let eltsToDelete = null;
    clickedElt.innerText[11]==="P"?eltsToDelete="plnts":eltsToDelete="grdns";

    // if gardens or plants exist and are stored, loop through their ls
    // counters and delete their entries from localStorage and from html
    if (localStorage.getItem("aas_myGardenVs_"+eltsToDelete)) {
      let counter = localStorage.getItem("aas_myGardenVs_"+eltsToDelete).split(",");
      for (i in counter) {
        del(svgPlace.getElementById(eltsToDelete[0] + "_" + counter[i]));
      }
      // remove the plant/garden counter from local storage
      localStorage.removeItem("aas_myGardenVs_"+eltsToDelete);
      hideDropDown();
    }
  }
}

//////////////////////////////////////////////////////////////////////
// this function toggles b/w cm and inches, triggered by settings menu
function toggleCmIn(units) {
  let vals = ['grdns']; //, 'plnts'];todo: not done, see below
  for (let x = 0, l = vals.length; x < l; x++) {
    if (localStorage.getItem("aas_myGardenVs_"+vals[x])) {
      let counter = localStorage.getItem("aas_myGardenVs_"+vals[x]).split(",");
      for (let i = 0, l = counter.length; i < l; i++) {
        // for each garden, update the size indicators to display in units chosen
        // the units in local storage and settings menu are updated before this is called
        let grp = svgPlace.getElementById(vals[x][0]+"_"+counter[i]);
        if (vals[x] === "grdns") {
          grp.getElementsByClassName("sizeInd")[0].textContent =
            formatSizeDisplay(Number(grp.children[0].getAttribute("height"))/size);
          grp.getElementsByClassName("sizeInd")[1].textContent =
            formatSizeDisplay(Number(grp.children[0].getAttribute("width"))/size);
        }
        //todo: not done - need to convert displayed size to inches before supplying it to format...
        else if (grp.getElementsByClassName("plantSize")) {
          const plantSize = grp.getElementsByClassName("plantSize")[1];
          if (plantSize)
            plantSize.textContent =
            "avg: " +
//             formatSizeDisplay(Number(...)) +
            " x " //+
//             formatSizeDisplay(Number(...));
        }
      }
    }
  }
}

// this function converts the supplied size value: if two arguments are supplied,
// the returned result is one part (all cm or in); if one argument (all cm or in),
// return two part size (m and cm or ft and in)
// the incoming size is always in inches
function formatSizeDisplay(x1, x2) {
  //x = units (metric 1 or not 0), x1 = higher group (m or feet), x2 = lower group (cm or in)
    let x = Number(localStorage.aas_myGardenVs_units);
  let ind1 = "", ind2 = "", denom = 1;
  //if metric,
  // the incoming size that's in inches needs to be converted to cm
  // the denominator used for formatting is 100, otherwise 12
  // the displayed format will show m & cm, otherwise ' and "
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

  // if a second argument is supplied, convert to small units and return one number
  if (x2){
    return parseInt(x1*denom+x2,10);
  }
  // if there are bigger units and a remainder, display bigger and smaller units
  else if ((parseInt(x1/denom,10)) && (parseInt(x1%denom,10))) {
    return parseInt(x1/denom,10)+ind1 + parseInt(x1%denom,10)+ind2;
  }
  // if a bigger unit is 0 and smaller is available (i.e. there is a remainder)
  else if (!(parseInt(x1/denom,10)) && (parseInt(x1%denom,10))) {
    return parseInt(x1%denom,10)+ind2;
  }
  // if there are bigger units and no smaller units
  else if ((parseInt(x1/denom,10)) && !(parseInt(x1%denom,10))) {
    return parseInt(x1/denom,10)+ind1;
  }
  // otherwise display 0 and smaller unit indicator
  else {
    return 0+ind2;
  }
//     let result = null;
//     x1%12?result=parseInt(x1/denom,10)+ind1+parseInt(x1%denom,10)+ind2:result=parseInt(x1/denom,10)+ind1;
//     return result;
}

/**
 * onvert color codes to strings and vice versa
 * @param {color} string the code or name of color
 * @returns rgb code or a color name, depending on the input
*/
function colorConverter (string) {
// ******** DO NOT CHANGE THE ORDER OF THE COLORS ********
  const colorCodes = ({
    "blue":"rgb(40, 116, 237)",
    "brown":"rgb(255, 102, 102)",
    "brownish-red":"rgb(196, 136, 124)",
    "coral":"rgb(255, 102, 102)",
    "cream":"rgb(240, 237, 218)",
    "creamyWhite":"rgb(255, 253, 230)",
    "darkBlue":"rgb(0, 0, 153)",
    "darkPink":"rgb(255, 102, 153)",
    "darkPurple":"rgb(103, 0, 103)",
    "deepGreen":"rgb(0, 102, 0)",
    "deepPink":"rgb(212, 30, 90)",
    "emeraldGreen":"rgb(38, 115, 38)",
    "gold":"rgb(217, 195, 33)", // stopped here, finish adding colors
    "green":"rgb(50, 133, 59)",
    "greenish-white":"rgb(217, 242, 217)",
    "greenish-yellow":"rgb(230, 255, 179)",
    "indigoBlue":"rgb(74, 51, 222)",
    "lavender":"rgb(150, 153, 255)",
    "lightBlue":"rgb(179, 218, 255)",
    "lightGreen":"rgb(204, 255, 204)",
    "lightPink":"rgb(255, 204, 225)",
    "lilac":"rgb(230, 204, 255)",
    "magenta":"rgb(255, 0, 255)",
    "peach":"rgb(253, 217, 181)",
    "pink":"rgb(255, 102, 153)",
    "pinkish-lavender":"rgb(242, 211, 227)",
//     "purple and yellow":"rgba(0,100,0,0.75)",  // todo: need code instead of dark green
    "purpleRed":"rgb(192, 0, 64)",
    "purplish-pink":"rgb(192, 96, 166)",
    "rose":"rgb(255, 153, 204)",
    "violet":"rgb(230, 130, 255)",
    "whiteAndPurple":"rgb(240, 240, 240)",  // todo: need code instead of dark green
    "yellowish-green":"rgb(198, 210, 98)",
    "yellowCenter":"rgb(200, 200, 0)"
  });

	// if an rgb code is sent, return the color name
  if (string.slice(0,3) === "rgb") {
    for (let key in colorCodes) {
      if (colorCodes[key] === string) {
        return key;
      }
    }
  }
  // if a color name that needs to be converted is sent, return rgb
  else if (string in (colorCodes)) {
    return colorCodes[string];
  }
  // otherwise return a color name in camel case when needed
  // this is used when the color isn't listed in colorCodes, but
  // its name is valid as is or if converted to camel case notation
  else {
    return camelCase(string);
  }
}

function camelCase(str) {
  str = str.trim();
  return str.replace(/\s+(.)/g, function (match, group) {
    return group.toUpperCase();
  });
}

//////////////////////////////////////////////////////////////////////
// this function creates and saves to Local Storage an SVG group representing
// a garden with functionality to move, resize & delete the group, rename the
// planting area/garden, and set its sun & soil availability.
function addGarden(elt){

  // var to capture widths of sun & tools gears, used for name centering
  let widthOfSunToolsGear = 0;

  // create a flag used to hide sun, tools, resize on reload;
  let oldGarden = true;

  // to indicate that a NEW planting area is created as opposed to an existing one
  // loaded from local storage, the supplied id for it is set to null, thus no gId
  if (!elt.gId) {
    oldGarden = false;
    // when creating a NEW garden, as opposed to loading an existing one, create and record
    // the new garden id: 1 for the first one or the stored garden counter grdnCntr plus one.
    if (!localStorage.aas_myGardenVs_grdns) {
      elt.gId = 1;
      localStorage.setItem("aas_myGardenVs_grdns","1");
    } else {
      const IDs = localStorage.aas_myGardenVs_grdns.split(",");
      elt.gId = Number(IDs[IDs.length-1])+1;
      // add the new garded id to local storage, i.e. update garden counter
      localStorage.aas_myGardenVs_grdns += "," + elt.gId.toString();
    }
    // record the new garden area data in local storage and update the total garden count; round x,y,w,h to 2 decimal places
    localStorage.setItem("aas_myGardenVs_grdn"+elt.gId,
                         elt.x.toFixed(1) + "," + elt.y.toFixed(1) + "," +
                         elt.w.toFixed(1) + "," + elt.h.toFixed(1) + "," +
                         elt.nm + "," + elt.sn + "," + elt.sl);
  }

  // class is always "garden" for a garden, so setting it here
  elt.cls = "garden";

  // the group, grp, below keeps all elements of one garden
  // together so that they move together in the SVG area
  var grp = document.createElementNS(xmlns, "g");
  grp.setAttribute("transform", "translate(0,0)");
  grp.setAttribute("id", "g_"+elt.gId);
  grp.setAttribute("class", elt.cls+"Grp");
  svgPlace.appendChild(grp);

  // the rectangle (rect) of the planting area (garden)
  grp.appendChild(mkRect(elt));

  // create a sun drop down button using supplied text value, stored in
  // sn var for an existing garden and sun icon "\uf185" for a new garden
  gardenElt = mkText({
    x:elt.x+munit*0.5,
    y:elt.y+munit*2,
    cls:"gdnBtn ulSun",
    txt:elt.sn+" \uf0d8"});
  grp.appendChild(gardenElt);
  widthOfSunToolsGear += gardenElt.getBoundingClientRect().width;
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

  // create the garden tool box - a gear icon drop down
  gardenElt = mkText({
    x:elt.x + Number(grp.children[0].getAttribute("width"))-munit*3,
    y:elt.y+munit*2,
    cls:"gdnBtn ulTools",
    txt:"\xa0\uf013"
  });
  grp.appendChild(gardenElt);
  widthOfSunToolsGear += gardenElt.getBoundingClientRect().width;
  if (oldGarden) {gardenElt.setAttribute("display", "none");}


  // create "Garden Name", an editable text element, using supplied value for an existing garden or "New Garden" for a new one; for y-value, check if there is enough room: width of parent (garden) minus approximate width of sun and tools gears, from elt.desc, compared to number of characters in the garden name multiplied by munit; if not enough room, y is adjusted to place the garden name above the garden;
  const nmW = 150;
  const nmY = elt.w - widthOfSunToolsGear < nmW
    ? elt.y-munit * 2.7
    : elt.y-munit / 2;
  grp.appendChild(mkForeignObj({
    // center the garden name: parent's x and w less half of garden name width
    x: elt.x + elt.w / 2 - nmW/2,
    y: nmY,
    w: nmW,
    h: 25,
    desc: widthOfSunToolsGear,
    cls: "editable",
    tg: "input",
    txt: elt.nm
  }));
//   gardenElt.setAttribute("contentEditable", "true");

  // create the soil indicator - drop down
  gardenElt = mkText({
    x:elt.x + munit / 2,
    y:elt.y + Number(grp.children[0].getAttribute("height"))-munit,
    cls:"gdnBtn ulSoil",  //this order has to remain the same, otherwise use Array.from(group.classList).findIndex(x=>x.includes("li")) when retrieving ulSoil
    txt:elt.sl+" pH\xa0\uf0d7"
//     txt:elt.sl+" pH\xa0\uf102"
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

  //call the coloring of the garden with sun/soil choice combo
  sunSoilChoice(grp);

  //the following two SVG texts display the Width and Height of the planting area
  //the width and height are extracted from rect, because they're multiplied by 2
  //height
  gardenElt = mkText({
    x:elt.x + Number(grp.children[0].getAttribute("width")),
    y:elt.y + munit*2,
    cls:"sizeInd",
    txt:formatSizeDisplay(elt.h/size)
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

  //width
  gardenElt = mkText({
    x:elt.x + munit,
    y:elt.y+Number(grp.children[0].getAttribute("height"))+munit*1.3,
    cls:"sizeInd",
    txt:formatSizeDisplay(elt.w/size)
  });
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

//create the "resizing" triangle displayed in the bottom right corner of the garden rectangle; triangle's color is set in visual.css file
  gardenElt = document.createElementNS(xmlns, "polygon");
  gardenElt.setAttribute("points", createTriPts(
    elt.x+Number(grp.children[0].getAttribute("width")),
    elt.y+Number(grp.children[0].getAttribute("height"))));
  gardenElt.setAttribute("class", "resize");
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

  // top left resizor
  gardenElt = document.createElementNS(xmlns, "polygon");
  gardenElt.setAttribute("points",
    `${elt.x},${elt.y} ${elt.x+munit*4},${elt.y} ${elt.x},${elt.y+munit*4}`);
  gardenElt.setAttribute("class", "resize");
  grp.appendChild(gardenElt);
  if (oldGarden) {gardenElt.setAttribute("display", "none");}

//the returned grp.id is used for duplicating gardens
  return grp.id;
}

//////////////////////////////////////////////////////////////////////
//create and return points for a trianlge as "a,b a,c b,c" string, based on the supplied corner and its x & y coordinates
function createTriPts(x, y) {
  return x + "," + (y-munit*4) //x & y positions of the right side of the rectangle
  + " " + x + "," + y //x & y positions of the right bottom corner of the rectangle
  + " " + (x-munit*4) + "," + y; //x & y positions of the bottom of the rectangle
}

//////////////////////////////////////////////////////////////////////
//this function provides decision making for when a garden is clicked
function gardenFork(clickedElt) {

  if (clickedElt.id === "svgArea") return;

  //capture the x&y along with tX&tY of the garden
  const gnX = Number(clickedElt.parentElement.children[0].getAttribute("x")) + clickedElt.parentElement.transform.baseVal.getItem("translate").matrix.e;
  const gnY = Number(clickedElt.parentElement.children[0].getAttribute("y")) + clickedElt.parentElement.transform.baseVal.getItem("translate").matrix.f;
  const gnW = Number(clickedElt.parentElement.children[0].getAttribute("width"));
  const gnH = Number(clickedElt.parentElement.children[0].getAttribute("height"));
  const gnNM = clickedElt.parentElement.getElementsByClassName("editable")[0].children[0].value;

  const menu = {
    values:[],
    xPos: gnX,
    yPos: gnY
  };

  //if the garden is too close to the right edge of the screen, the xOffset is negative, so that the UL menu is not off the screen; 96 = munit (~ half the font size) * 12 (UL min width)
  const xOffset = (Number(svgPlace.getAttribute("width")))>(gnX+gnW+96) ? munit*2 : -96;

  //click on one of the garden settings "buttons"
  if (clickedElt.classList.contains("gdnBtn")){

    //sun
    if (clickedElt.classList.contains("ulSun")) {
      menu.values = ["Full", "Part", "Shade"];
      menu.yPos -= munit * 10;
    }
    //soil
    else if (clickedElt.classList.contains("ulSoil")) {
      menu.values = ["Acidic", "Neutral", "Alkaline"]
      menu.yPos += gnH;
    }
    //tools
    else if (clickedElt.classList.contains("ulTools")) {

      let otherTools = true;

      menu.values = ["Duplicate this garden"];
      menu.xPos += gnW + xOffset;

      //if the name has been changed from New Garden
      if (gnNM != "New Garden") {
        menu.values.push("Pull plants for " + gnNM);
        otherTools = false;
      }
      //if there is one, and only one, plant in the garden
      if (clickedElt.parentElement.getElementsByTagName("g").length === 1) {
        //get the name of the one plant in the garden
        menu.values.push("Pull companions for " + clickedElt.parentElement.getElementsByClassName("plant")[0].children[0].textContent);
        otherTools = false;
      }
      //if sun and soil have been set
      if (clickedElt.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0]!="\uf185" &&
          clickedElt.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0]!="Soil") {
        menu.values.push("Pull plants based on sun & soil");
        otherTools = false;
      }
      //if no changes have been made to the garden, display a note that most of the tools aren't available yet
      if (otherTools) {
        menu.values.push("Other tools are available when a single plant is added, a garden is named, or sun and soil are set");
      }
    }

    const dropDownMenu = getUL(menu);
    dropDownMenu.addEventListener("click", function(evt) {
      chgGarden(evt.target, clickedElt);
    });
    document.body.appendChild(dropDownMenu);

    // "btn" argument below is the element that triggers the dropdown
    function chgGarden(tgt, btn) {

      //if sun or soil "drop down" choice is clicked
      if (["ulSun", "ulSoil"].some(className => btn.classList.contains(className))) {
        //update the "drop UL button" text with the value chosen + arrow
        btn.textContent = tgt.innerText + " " + btn.textContent.split(" ")[1]

        //call the update of the garden's colors
        sunSoilChoice(btn.parentElement);

        //call the update of the local storage with sun & soil choices
        updateLocalStorage(
          btn.parentElement.id,
          btn.classList.contains("ulSun")?"sun":"soil",
          tgt.textContent);
      }

      //if one of tools choices is clicked
      else if (tgt.textContent === "Duplicate this garden") {
        //the yOffset is needed for the vertical offset of duplicate garden and its plants
        const yOffset = gnH+munit * 2;
        //clone the garden
        let dupGardenId = addGarden(
          {gId:null,
           x:gnX,
           y:gnY + yOffset,
           w:gnW,
           h:gnH,
           nm:gnNM + " copy",
           sn:btn.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0],
           sl:btn.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0]
          });
        //if there are any plants in the garden, clone them too
        let len = btn.parentElement.getElementsByTagName("g").length;
        if (len) {
          for (let i = 0; i < len; i++) {
            let dupPlantSpecs = localStorage.getItem(
              "aas_myGardenVs_plnt" +
              btn.parentElement.getElementsByTagName("g")[i].id.split("_")[1])
            .split(",");
            addPlant ({
              pId:null,
              x:Number(dupPlantSpecs[0]),
              y:Number(dupPlantSpecs[1]) + yOffset ,
              w:Number(dupPlantSpecs[2]),
              h:Number(dupPlantSpecs[3]),
              nm:dupPlantSpecs[4],
              gId:dupGardenId,
              lnm:dupPlantSpecs[6], //plant's latin name
              shp:dupPlantSpecs[7], //shape
              clr:dupPlantSpecs[8], //color
              blm:dupPlantSpecs[9] //bloom months
            })
          }
        }
      }

      //place "plants in garden", "companions", "sun/soil" plants container next to the clicked garden
      else if (tgt.textContent.slice(0,4) === "Pull") {
        let flt = null, tp = null, f_plntLN = null, f_plntCN = null;
        switch (tgt.textContent.slice(0,15)) {
          case "Pull plants bas":
            flt = [btn.parentElement.getElementsByClassName("ulSun")[0].textContent.split(" ")[0].toLowerCase(),
                   btn.parentElement.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0].toLowerCase()],
            tp = "sunSoil";
            break;
          case "Pull plants for":
            flt = btn.parentElement.getElementsByClassName("editable")[0].children[0].value.toLowerCase();
            tp = "gName";
            break;
          case "Pull companions":
            f_plntLN = btn.parentElement.getElementsByTagName("g")[0].children[0].getAttribute("desc"),
            f_plntCN = tgt.innerText.replace("Pull companions for ", "").toLowerCase(),
            tp = "companions";
            break;
          }
        addPlantMenu({
          xPos: gnX + gnW + xOffset,
          yPos: gnY,
          type: tp,
          filter: flt,
          forPlantLN: f_plntLN,
          forPlantCN: f_plntCN,
          gId: btn.parentElement.id,
          gX: gnX,
          gY: gnY,
          gW: gnW,
          gH: gnH
        });
      }
    }
  }

  // display editing buttons (sun choices, garden name, toolbox) when a garden is clicked
  else if (clickedElt.classList.contains("garden")){
    hideDropDown();

    // number of garden objects to hide
    let l = 8;

    // toggle the display of the size, sun and toolbox drop down buttons,
    // not their choices, not the sun or toolbox drop down choices
    if (clickedElt.parentElement.getElementsByClassName("resize")[0].getAttribute("display") != "none") {

      // start at 1, because 0 is the rect
      for (let i = 1; i < l;  i++){
        // 2 is the name
        if (i===3) continue;
        clickedElt.parentElement.children[i].setAttribute("display", "none");
      }
    } else {
      for (let i = 1; i < l; i++){
        if (i===3) continue;
        clickedElt.parentElement.children[i].setAttribute("display", "block");
      }
    }

  }
}

/**
 * adds a plant; called by a click on li or onload
 * the plant consists of its name, size and photo
 * @param {object} elt with plants specifications
 * @returns the group with the plant
 */
function addPlant(elt) {
  // class name for all plants and their shapes is "plant"
  elt.cls = "plant";

  // if the id of elt (pId) is 0, then this is a new plant, as opposed to one loaded from localStorage;
  // this new plant's pId needs to be set to either a 1 for the very first plant
  // or the highest number in localStorage.aas_myGardenVs_plnts plus one
  if(!elt.pId) {
    if(!localStorage.aas_myGardenVs_plnts) {
      elt.pId = 1;
      // record new plant id in the local storage plnts counter
      localStorage.setItem("aas_myGardenVs_plnts","1");
    } else {
      // pull all IDs into an array
      const IDs = localStorage.aas_myGardenVs_plnts.split(",");
      // take the last (highest) ID and add one to it
      elt.pId = Number(IDs[IDs.length-1])+1;
      // record new plant id in the local storage plnts counter
      localStorage.aas_myGardenVs_plnts += ","+elt.pId.toString();
    }

    // when a new plant is created, make sure it's not placed outside of screen boundaries
    if(elt.x < 0) elt.x = 1;
    if(elt.x > Number(svgPlace.getAttribute("width"))) {
      elt.x = Number(svgPlace.getAttribute("width")) - munit;
    }
    if(elt.y > Number(svgPlace.getAttribute("height"))) {
      elt.y = Number(svgPlace.getAttribute("height")) - munit*1.5;
    }

    // record the new plant data in the local storage; round x,y,w,h to 2 decimals
    localStorage.setItem(
      `aas_myGardenVs_plnt${elt.pId}`,
      `${elt.x.toFixed(1)},${elt.y.toFixed(1)},${elt.w.toFixed(1)},${elt.h.toFixed(1)},${elt.nm},${elt.gId},${elt.lnm},${elt.shp},${elt.clr},${elt.blm}`);
  }

  // the group below (grp) keeps all elements of one plant together
  const grp = document.createElementNS(xmlns, "g");

  // if the garden id is 0, the plant is free-standing, not a part of a garden
  // note: when data is added to localStorage, null or 0 value is converted to string
  if (!elt.gId || elt.gId === "0") {
    grp.setAttribute("transform", "translate(0,0)");
    svgPlace.appendChild(grp);
  }
  // otherwise, if garden id is not 0, put the plant in its garden (capture the translate of the garden for the plants added to the garden; the stored value combines x,y with tx,ty)
  else {
    let inGarden = svgPlace.getElementById(elt.gId);
    grp.setAttribute(
      "transform",
      "translate (" +
      inGarden.transform.baseVal.getItem("translate").matrix.e * -1 + " " +
      inGarden.transform.baseVal.getItem("translate").matrix.f * -1 + ")");
    inGarden?inGarden.appendChild(grp):svgPlace.appendChild(grp);
  }

  // the id attr of the plant SVG element is prefixed with a "p_" to differentiate from garden id, which prefixed with a "g_"
  grp.setAttribute("id", `p_${elt.pId}`);
  grp.setAttribute("class", "plantGrp");

  // create a text element with plant's common name
  elt.txt = elt.nm.length > 12 ? elt.nm.slice(0,12) + "..." : elt.nm;
  elt.ttl = elt.nm;
  // elt.fntSz = elt.nm.length > 15 && "smaller";
  // ToDo: work needs to be done about doubled plant name and/or title?
  const plantName = mkText(elt);

  // if the plant is currently in bloom, add its flower color;
  if (elt.blm.split(';').includes(currMonth.toString())) {
    colorPlant(plantName, `p_${elt.pId}`, elt.clr);
  }
  // if it's a non-winter month or if the plant is evergreen, fill 'leafs' with green;
  else if (["b","s","e"].includes(elt.shp[1]) || !(winterMos.includes(mos[currMonth]))) {
    plantName.style.fill = 'green';
    // plantName.style.fontWeight = '900';
  }
  grp.appendChild(plantName);
  return grp;
}

/**
 * toggle plant's pic, size, info, flowering colors; called when clicked on a plant, touchUp
 * @param {*} tgt clicked element
 */
function togglePlantInfo(tgt) {
  // hide all the info if plant's colors are displayed
  if (clickedGroup.classList.contains("displayPlantInfo")) {
    clickedGroup.classList.remove("displayPlantInfo");
    hideDropDown();
    return;
  }
  clickedGroup.classList.add("displayPlantInfo");
  // specifications
  const sd = localStorage.getItem("aas_myGardenVs_plnt" + clickedGroup.id.substring(2,clickedGroup.id.length)).split(",");
  const specs = {
    x: Number(clickedGroup.children[0].getAttribute("x")),
    y: Number(clickedGroup.children[0].getAttribute("y")),
    xOffset: clickedGroup.transform.baseVal.getItem("translate").matrix.e,
    yOffset: clickedGroup.transform.baseVal.getItem("translate").matrix.f,
    w: Number(sd[2]),
    h: Number(sd[3]),
    inGdn: sd[5] !== "0",
    lnm: sd[6], //latin name
//       clr:sd[8] //saved color chosen for the plant, if ever needed
  }
  // offset, currently used for non-SVG elements
  let offset = 30;
  const plantNameWidth = Math.round((clickedGroup.children[0].getComputedTextLength() + Number.EPSILON)*100)/100;

  // add plant other info, using Latin Name stored in desc of a plant
  fetch('plants.json')
    .then((res) => {
      return(res.json());
    })
    .then((myObj) => {
      // remove the first entry in myObj - those are column headers, not needed
      delete myObj["Latin&nbspName"];

      const plantLatinName = tgt.parentElement.children[0].getAttribute("desc");
      // if the plant is in a garden, capiture garden translate x & y
      const g_x_pos = specs.inGdn ? tgt.parentElement.parentElement.transform.baseVal.getItem("translate").matrix.e : 0;
      const g_y_pos = specs.inGdn ? tgt.parentElement.parentElement.transform.baseVal.getItem("translate").matrix.f : 0;

      const xColorPos = specs.x + specs.xOffset + g_x_pos;
      const yColorPos = specs.y + specs.yOffset + g_y_pos;

      // add plant picture, if there is one
      const pic = document.createElement("img");
      if (parseInt(myObj[plantLatinName][28])) {
        const plantCommonName = tgt.children.length ? tgt.children[0].innerHTML : tgt.innerHTML;
        pic.className = "plantPic plantDetails";
        // image plantPic's width is 100px, adjusting x-pos by half to the left
        pic.style.left = xColorPos + plantNameWidth / 2 - 50 + "px";
        pic.style.top = yColorPos - offset * 4.5 + munit * 2 + "px";
        pic.src = `pictures/${plantCommonName.replace((/( |-|\(|\)|v\.|&|\"|\')/g),"")}1.jpg`;
        pic.alt = plantCommonName;
        document.body.appendChild(pic);
      }

      // COLOR CHOICES
      const inconspicuousFlag =
        myObj[plantLatinName][1].includes("inconspicuous") || myObj[plantLatinName][6].includes("inconspicuous");
      // any flower color choices are stored in the descrition field "desc";
      // capture them into an array, removing 'inconspicuous', trailing commas or semicolons at the end of the sting;
      let plantColors = myObj[plantLatinName][6].replace(/inconspicuous(;|,)? ?|,$|;$/g,"").split(/, ?|; ?/);

      // if no colors are available, place one default value green in the array
      if (plantColors === "" || !(plantColors.length)) {
        plantColors = ["green"];
      }
      // otherwise, if plant colors array doesn't have "green", add one
      else {
        if (!plantColors.includes("green"))plantColors.unshift("green");
      }

      for (let i = 0, l = plantColors.length; i < l; i++) {
        const colorBtn = document.createElement("button");
        colorBtn.className = "plantColor plantDetails";
        colorBtn.style.left = xColorPos + munit - plantColors.length / 2 * 16 + 32 * i + "px";
        colorBtn.style.top = yColorPos + munit + "px";
        colorBtn.style.backgroundColor = colorConverter(camelCase(plantColors[i]));
        colorBtn.addEventListener("click", () => {
          colorPlant(tgt, tgt.parentElement.id, (inconspicuousFlag ? "i_" : "") + camelCase(plantColors[i]));
        });
        document.body.appendChild(colorBtn);
      }

      // Add OTHER INFO fields - plant info div
      const plantInfo = document.createElement("div");
      plantInfo.className = "plantInfo plantDetails";
      plantInfo.style.left = xColorPos + plantNameWidth / 2 - 100 + "px";
      plantInfo.style.top = yColorPos + offset + munit * 2 + "px";
      document.body.appendChild(plantInfo);

      // add plant size
      const infoLine = document.createElement("div");
      infoLine.innerHTML = "Avg Size: " + formatSizeDisplay(specs.w) + " x " + formatSizeDisplay(specs.h);
      plantInfo.appendChild(infoLine);

      // The "desc" field of the tgt (plant name) holds latin name, used as a key to pull all other information
      // set the desired Other Info fields, using their column/order numbers as keys
      const plantInfoFields = {7:"Leaves: ", 8:"Bloom Time: ", 10:"Sun: ",
                              11:"Roots: ", 12:"Garden Quantities: ", 16:"Companions: ",
                              17:"Enemies: ", 18:"Soil: "};
      for (let f in plantInfoFields) {
        if (myObj[plantLatinName][f] === "") {
          continue;
        }
        let infoLine = document.createElement("div");
        infoLine.innerHTML = plantInfoFields[f] + myObj[plantLatinName][f];
        plantInfo.appendChild(infoLine);
      }
  })
  .catch(() => {
    console.log("Unable to access or error reading plants file.");
  });
}

/**
 * add text shadow to represent plant in bloom
 * @param {HTMLElement} plant text element for the plant
 * @param {string} pId plant id
 * @param {string} color plant color name (not code), include i_ for inconspicuous
 */
function colorPlant(plant, pId, color) {
  const formattedColor = colorConverter(color.replace("i_",""));
  if (color[0] === 'i') {
    plant.style.stroke = formattedColor;
    plant.style.strokeWidth = "1px";
  } else {
    plant.style.textShadow = `
    0 -7px 5px ${formattedColor},
    0 -7px 5px ${formattedColor},
    0 -7px 5px ${formattedColor}`;
  }
  plant.style.fill = "green";
  updateLocalStorage(pId, "color", color === "green" ? "" : color);
}

/**
 * create an SVG text element
 * @param {object} specs include x, y, class name, text
 * @returns an SVG text element
 */
function mkText(specs) {
  const txtElt = document.createElementNS(xmlns, "text");
  if (specs.lnm) txtElt.setAttribute("desc", specs.lnm);
  if (specs.clr) txtElt.setAttribute("fill", specs.clr);
  if (specs.ttl) {
    const txtTitle = document.createElementNS(xmlns, "title");
    txtTitle.innerHTML = specs.ttl;
    txtElt.appendChild(txtTitle)
  }
  txtElt.setAttribute("x", specs.x);
  txtElt.setAttribute("y", specs.y);
  txtElt.setAttribute("class", specs.cls);
  const txtVal = document.createTextNode(specs.txt);
  txtElt.appendChild(txtVal);
  return txtElt;
}

/**
 * create an SVG rectangle element representing a garden
 * @param {object} specs include x, y, width, height, class name
 * @returns an SVG rect element
 */
const mkRect = (specs) => {
  let rectElt = document.createElementNS(xmlns, "rect");
  rectElt.setAttribute("x", specs.x);  //arguments: namespace=null, varName="x", varValue=x
  rectElt.setAttribute("y", specs.y);
  rectElt.setAttribute("width", specs.w);
  rectElt.setAttribute("height", specs.h);
  rectElt.setAttribute("class", specs.cls);
  return rectElt;
}

//////////////////////////////////////////////////////////////////////
// garden name - editable text field as a foreign object;
// the garden name is centered in the top of the garden area; if the
// garden is very narrow, the garden name is moved up, above the garden
// to determine if the garden is too small for the name to fit inside, name's
// width is subtracted from garden width less the widths of sun & tools gears
// the combined width of sun & tools gears is supplied and provided in desc
function mkForeignObj(elt) {

  let foreigner = document.createElementNS(xmlns, "foreignObject");
  foreigner.setAttribute("x", elt.x);
  foreigner.setAttribute("y", elt.y);
  if (elt.w) foreigner.setAttribute("width", elt.w);
  if (elt.h) foreigner.setAttribute("height", elt.h);
  foreigner.setAttribute("class", elt.cls);
  if (elt.desc) foreigner.setAttribute("desc", elt.desc);

  let txt = document.createElement(elt.tg);
//   txt.className = elt.cls;
  if (elt.tg === "input") {
    txt.value = elt.txt;
  } else {
    txt.textContent = elt.txt.replaceAll("&gt;",">").replaceAll("&lt;","<").replaceAll("&leq;","<=").replaceAll("&geq;",">=");
  }
  foreigner.appendChild(txt);
  return foreigner;
}

/*
// ToDo: reuse plant shape logic to color plant name
// function drawPlantShape(plantGroup, specs) {
//   // evergreen tree: always a green triangle
//   // evergreen vine: green drooping vine-lines
//   // all other evergreen & biennial: branches & green circle
//   // deciduous vines: greenish-brown vines, green in non-winter months
//   // annual: in warm months only, brances & green circle
//   // all other (perennial, deciduous): branches, and in warm months - green circle;

//   const dt = new Date;
//   //leafy and flowery shapes are used to hold shapes with leafs (branches, trianlge) and shapes with flowers
//   let leafyShape = null;
//   let floweryShape = null;

//   //tree(t) evergreen(e)
//   if (specs.shp === "te") {

//     //make an evergreen tree triangle
//     leafyShape = document.createElementNS(xmlns, "polygon");
//     leafyShape.setAttribute("class", specs.cls + " plantShapeColor");
//     leafyShape.setAttribute(
//       "points",
//       `${specs.x+specs.w/2}, ${specs.y} ${specs.x+specs.w}, ${specs.y+specs.h} ${specs.x}, ${specs.y+specs.h}`
//     );
//     plantGroup.appendChild(leafyShape);

//     //create a smaller triangle to hold the flowering effect for a conical evergreen tree
//     floweryShape = document.createElementNS(xmlns, "polygon");
//     floweryShape.setAttribute("class", specs.cls + " plantShapeColor plantFlowerShapeColor");
//     floweryShape.setAttribute(
//       "points",
//       `${specs.x + specs.w/2}, ${specs.y + specs.h*0.1} ${specs.x + specs.w*0.9}, ${specs.y + specs.h*0.6} ${specs.x + specs.w*0.1}, ${specs.y + specs.h*0.6}`
//     );
//     plantGroup.appendChild(floweryShape);
//   }
//   //not evergreen trees
//   else {
//     const numOfBranches = specs.shp[0] === "v" ? 6 : 4;
//     const spread = Math.round(specs.w / numOfBranches);

//     for (let i = 0; i < numOfBranches; i++) {
//       const shapeElt = document.createElementNS(xmlns, "path");
//       shapeElt.setAttributeNS(null, "class", specs.cls + " shape");
//       shapeElt.setAttributeNS(
//         null,
//         "d",
//         specs.shp[0] != "v" ?
//         `m ${specs.x + spread * i} ${specs.y}
//          c ${specs.w * 0.1 * (1 - i)} ${specs.w * 0.1}
//            ${specs.w * 0.2 * (1 - i)} ${specs.w * 0.5}
//            ${specs.w / 2 - spread * i} ${specs.h}` :
//         `m ${specs.x + specs.w / 2} ${specs.y}
//          c ${specs.w * 0.1 * (1 - i)} ${specs.w * 0.1}
//            ${specs.w * 0.2 * (3 - i)} ${specs.w * 0.5}
//            ${specs.w / 2 - spread * i} ${specs.h}`
//       );
//       if (specs.shp[1] === "a") {
//         shapeElt.style.display = winterMos.includes(mos[currMonth]) ?  "none" : "inline";
//       }
//       plantGroup.appendChild(shapeElt);
//     }

//     //also for all plants that aren't evergreen trees, add two circles for leaves and flowers

//     //set a radius to be used for leafs/flowers
//     specs.r = specs.w/2;
//     //adjust specs for leaf/flower circle
//     specs.x += specs.w/2;
//     specs.y += specs.h/2;
//     specs.cls = specs.cls + " plantShapeColor";

//     //add a circle for leafs
//     leafyShape = mkCircle(specs);
//     plantGroup.appendChild(leafyShape);

//     //adjust the radius for flowers
//     specs.r = specs.w/1.7;
//     //add a circle to use for flowering
//     floweryShape = mkCircle(specs);

//     //add a circle for flowers
//     plantGroup.appendChild(floweryShape);

//   }

//   //if it's a non-winter month or if the plant is evergreen, fill leafs with green;
//   flowerGradClr(leafyShape,
//                 (["b","s","e"].includes(specs.shp[1]) || !(winterMos.includes(mos[currMonth]))) ?
//                 "green" : "transparent");
//   //if the plant is currently in bloom, add its flowering color;
//   flowerGradClr(floweryShape,
//                 specs.blm.split(';').includes(currMonth.toString()) ?
//                 specs.clr : "transparent");

// }
// //////////////////////////////////////////////////////////////////////
// //draw 'flowering' triangle or circle
// function flowerGradClr(flowerShape, color, shp, mo) {

//   if(!svgPlace.querySelector("defs").querySelector("#"+camelCase(color))) {
//     addGradient({
//       tp:'radial',
//       id:color
//     });
//   }
//   flowerShape.setAttribute("fill",` url(#${camelCase(color)})`);
// }
*/


/**
 * create a circle, used for flower color toggle buttons
 * @param {object} specs includes x & y position, radius, class
 * @returns SVG circle
 */
function mkCircle(specs) {
  const cirElt = document.createElementNS(xmlns, "circle");
  cirElt.setAttribute("cx", specs.x);
  cirElt.setAttribute("cy", specs.y);
  cirElt.setAttribute("r", specs.r);
  cirElt.setAttribute("class", specs.cls);

  // the flower color toggle buttons are filled with color here too
  if (specs.ttl) {
    cirElt.setAttribute("fill", specs.clr);
    const cirTitle = document.createElementNS(xmlns, "title");
    cirTitle.innerHTML = specs.ttl;
    cirElt.appendChild(cirTitle);
  }
  return cirElt;
}

//////////////////////////////////////////////////////////////////////
// this function provides garden color changing functionality
// for sun and soil dropdowns; parentElt is the parent of clicked element;
function sunSoilChoice(parentElt) {
  //fill with URL of color gradient for selected sun/soil combo
  parentElt.children[0].setAttribute("fill",
     "url(#"
     + parentElt.getElementsByClassName("ulSun")[0].textContent.split(" ")[0].replace("\uf185", "Full")
     + "_"
     + parentElt.getElementsByClassName("ulSoil")[0].textContent.split(" ")[0].replace("Soil","Neutral")
     + ")");
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// return the coordinates in SVG space, defined by the viewBox attribute, using the
// Current Transformation Matrix to convert clickPos x & y
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
// triggered by mouse or finger down on svg;
function touchDown(evt) {
  // exit, if it's a double click
  if (evt.detail === 2) return;

  // if tapped on garden name, increase the font to 16px to emphasize the name change and prevent zooming
  if (evt.target.parentElement.classList.contains("editable")) {
    evt.target.style.fontSize = "16px";
  }

  // the some() method executes the callback function once for each element in the array until it finds the one where the call back returns a true value
  if (["garden", "resize", "gdnBtn", "plant", "plantColor"].some(clsName => evt.target.classList.contains(clsName))) {
    // check if it's a resize
    if (evt.target.classList.contains("resize")) {
      if (evt.target.classList.contains("shapeH")) {
        resize = 1;
      }
      else if (evt.target.classList.contains("shapeV")){
        resize = 2;
      }
      else {
        resize = 3;
      }
    } else {
      resize = 0;
    }


    // mobile
    if (evt.touches)
      evt = evt.touches[0];

    // the clickedGroup is set to a group that's the parent of evt.target
    if (!clickedGroup){
      clickedGroup = evt.target.parentElement;
    }


    // set original click X & Y for resizing
    if (resize){
      clickPos.x = evt.clientX;
      clickPos.y = evt.clientY;
    }

    // adjust clicked point by SVG's viewbox
    offset = ["resize", "gdnBtn", "plantColor"].some(clsName => evt.target.classList.contains(clsName)) ? "NoMove" : getMousePosition(evt);

    // get all of clickedGroup's transforms
    let transforms = clickedGroup.transform.baseVal;

    // ensure the first transform is a translate transform; if the first transform
    // is not a translation or the element does not have a transform, then add one
    if (transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE || transforms.length === 0) {
      let translate = svgPlace.createSVGTransform();
      translate.setTranslate(0, 0);
      clickedGroup.transform.baseVal.insertItemBefore(translate, 0);
    }
    // get initial translation amount (traslate is set above to item 0)
    transform = transforms.getItem(0);
    offset.x -= transform.matrix.e;
    offset.y -= transform.matrix.f;
    //same as the two lines above
//     offset.x -= transforms.getItem(0).matrix.e;
//     offset.y -= transforms.getItem(0).matrix.f;
  }

  // hide all shown menus, unless a click is on classes specified above or the faux Ul
//   else if(!evt.target.classList.toString().includes("faux"))
  else {
    hideDropDown();
  }
}

//////////////////////////////////////////////////////////////////////////////////////
// moving a mouse or finger around, linked in html
// when an element is resized, its size is adjusted by the change in mouse/finger position
// when an element is moved, its position is set to the mouse/finger position, adjusted by svg matrix
function dragging(evt) {
// don't move the object if dragging anything other than a plant, a garden, or a resizer
  // if (!clickedGroup || !["plant", "garden", "resize"].some(clsName => evt.target.classList.contains(clsName))){
  //   return;
  // }
  if (!clickedGroup) return;
  // if (!["plant", "garden", "resize"].some(clsName => evt.target.classList.contains(clsName))) return;
  // remove any dropdown menus within the garden
  hideDropDown();

  // mobile
  if (evt.touches) evt = evt.touches[0];

  evt.preventDefault();
  coord = getMousePosition(evt);

  // RESIZING (garden only)
  if (resize) {

    // adjustments to width and height: the X and Y of the point of click/touch minus starting X and Y point of click
    let adjustedW = evt.clientX - clickPos.x;
    let adjustedH = evt.clientY - clickPos.y;

    // the resize object is the garden rectangle
    const resizeObj = clickedGroup.getElementsByTagName("rect")[0];

    // the new width and height are stored in newW & newH so that they can be checked for sensibility
    let newW = Number(resizeObj.getAttribute("width")) + adjustedW;
    let newH = Number(resizeObj.getAttribute("height"))+ adjustedH;

    // the width & height can't be negative, and shouldn't be less than 1'x1' (12*6);
    const minSize = 12 * size;
    if (newW < minSize) {
      newW = minSize;
      adjustedW = 0;
    }
    if (newH < minSize) {
      newH = minSize;
      adjustedH = 0;
    }

    // update the width and height of the rectangle
    resizeObj.setAttribute("width", newW);
    resizeObj.setAttribute("height", newH);

    // keep garden name centered or above, if not enough room for it
    const gName = clickedGroup.getElementsByClassName("editable")[0];
    gName.setAttributeNS(
      null,
      "x",
      Number(resizeObj.getAttribute("x")) +
      Number(resizeObj.getAttribute("width"))/2 -
      Number(gName.getAttribute("width"))/2);

    // check if enough room: new width newW minus the widths of sun and tools gears, from gName.desc, compared to number of characters in the garden name times munit/2 (approximate size of a letter, ~7.11)
    if ((newW - Number(gName.getAttribute("desc"))) <
        Number(gName.getAttribute("width"))) {
      gName.setAttribute("y", Number(resizeObj.getAttribute("y")) - munit * 2.7);
    } else {
      gName.setAttribute("y", Number(resizeObj.getAttribute("y")) - munit / 2);
    }

    // adjust the tools gear position, when its garden is resized
    const toolGear = clickedGroup.getElementsByClassName("ulTools")[0];
    toolGear.setAttribute("x", Number(toolGear.getAttribute("x"))+adjustedW);

    // adjust the soil selector position, when its garden is resized
    const soilGear = clickedGroup.getElementsByClassName("ulSoil")[0];
    soilGear.setAttribute("y", Number(soilGear.getAttribute("y"))+adjustedH);

    // update the size indicators
    const elts = clickedGroup.getElementsByClassName("sizeInd");

    // height
    elts[0].setAttributeNS(
      null,
      "x",
      Number(elts[0].getAttribute("x"))+adjustedW);
    // update the text of the height indicators
    elts[0].textContent = formatSizeDisplay(Number(resizeObj.getAttribute("height"))/size);

    // width
    elts[1].setAttributeNS(
      null,
      "y",
      Number(elts[1].getAttribute("y"))+adjustedH);
    // update the text of the width indicators
    elts[1].textContent = formatSizeDisplay(Number(resizeObj.getAttribute("width"))/size);

    // update the position of the resizing triangle
    clickedGroup.getElementsByClassName("resize")[0].setAttributeNS(
      null,
      "points",
      createTriPts(Number(resizeObj.getAttribute("x"))+newW,
                    Number(resizeObj.getAttribute("y"))+newH));
    // the sizing clickPos x & y need to be continuously updated
    // so that the size change is not cumulative
    clickPos.x = evt.clientX;
    clickPos.y = evt.clientY;
  }

  // MOVING
  else {

    if (offset === "NoMove") return;

    moving = true;

    if (clickedGroup?.id[0] === "p" ||
        coord.x - offset.x + parseFloat(clickedGroup.children[0].getAttribute("x")) > 0 &&
        coord.x - offset.x + parseFloat(clickedGroup.children[0].getAttribute("x")) +
        parseFloat(clickedGroup.children[0].getAttribute("width")) <
        Number(svgPlace.getAttribute("width")) &&
        coord.y - offset.y + parseFloat(clickedGroup.children[0].getAttribute("y")) >
        parseFloat(window.getComputedStyle(document.querySelector(".navbar")).height) &&
        coord.y - offset.y + parseFloat(clickedGroup.children[0].getAttribute("y")) +
        parseFloat(clickedGroup.children[0].getAttribute("height")) <
        Number(svgPlace.getAttribute("height"))
        ){
      transform.setTranslate(coord.x - offset.x, coord.y - offset.y);
      // the line below does the same as the line above
      // clickedGroup.transform.baseVal[0].setTranslate(coord.x - offset.x, coord.y - offset.y);
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////
// triggered by mouse or finger up, linked in html
function touchUp(evt) {
  // exit if there is no clicked group or it's a double click or a click is on plantColor
  if (!clickedGroup || evt.detail === 2 || evt.target.className === "plantColor") return;

  // now that I'm checking event detail, shouldn't need the following two commented out code
  // todo: test on mobile and delete the commented out code
  // if (evt.type.substring(0,5)==="touch") mobile = true; // do i care?
  // //the following block handles 'mouseup' event triggered on mobile, right after 'touchend'; on 'doubleclick' both touch and mouse events are called thus need to exit the function the second time around;
  // if (mobile) {
  //   if (evt.type.substring(0,5) === "mouse") {
  //     return;
  //   }
  // }

  // if a plant or garden has been moved, record their new position in local storage by combining translate value with x or y; evt.target is the plant's name or garden rectangle;
  if (clickedGroup && moving) {
    let g_tx = 0, g_ty = 0;
    if (clickedGroup.classList.contains("gardenGrp")){
      //update stored position(s) of the moved garden and plants within it (garden's child nodes)
      clickedGroup.childNodes.forEach(
        p => {
          if(p.tagName==="g") {
            updateLocalStorage(
              p.id,
              "x",
              p.transform.baseVal.getItem("translate").matrix.e +
              parseInt(p.children[0].getAttribute("x")) + coord.x - offset.x);

            updateLocalStorage(
              p.id,
              "y",
              p.transform.baseVal.getItem("translate").matrix.f +
              parseInt(p.children[0].getAttribute("y")) + coord.y - offset.y);
          }
        }
      );
    }
    else if (clickedGroup.classList.contains("plantGrp") && clickedGroup.parentElement.classList.contains("gardenGrp")) {
      // if plant is moved within a garden, capture its parent's (garden) tx,ty to store the correct value, including parent's tx,ty
      g_tx = clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.e;
      g_ty = clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.f;
    }

    //if a plant is being dragged by shape or branch, access the x/y from plant name, 1st child of the group
    updateLocalStorage(
      clickedGroup.id,
      "x",
      parseInt(clickedGroup.children[0].getAttribute("x")) + coord.x - offset.x + g_tx);
    updateLocalStorage(
      clickedGroup.id,
      "y",
      parseInt(clickedGroup.children[0].getAttribute("y")) + coord.y - offset.y + g_ty);
  }

  //record the new garden size in local storage when it's been resized;
  if (clickedGroup && resize) {
    const resizeObj = clickedGroup.getElementsByTagName("rect")[0];
    updateLocalStorage(
      clickedGroup.id,
      "w",
      Number(resizeObj.getAttribute("width")));
    updateLocalStorage(
      clickedGroup.id,
      "h",
      Number(resizeObj.getAttribute("height")));
  }

  // when a plant or garden is tapped and there is no drag or resize and it's not a double reaction to a click (either mouse or tap, not both)
  if (!moving && !resize && clickedGroup) {
    if (clickedGroup.classList.contains("plantGrp") && evt.target.classList.contains("plant")) { // if click on plant name (plant class)
      togglePlantInfo(evt.target);
    } else if (clickedGroup.classList.contains("gardenGrp")) { // if click on garden
      gardenFork(evt.target);
    }
  }

  // if moving a plant or a garden or resizing a garden, check if a plant and garden intersect
  if (resize && clickedGroup.id[0] === "g" || moving) {

    let grdns = localStorage.aas_myGardenVs_grdns;
    let plnts = localStorage.aas_myGardenVs_plnts;
    // first make sure both gardens and plants exist
    if (grdns && plnts) {
      // depending on which element is clicked check the intersection with the other one
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
// when a plant or a garden is moved, this function is called to check
// if any of the plants are in any gardens; the check is performed by
// comparing plants' & gardens' x & y positions adjusted by translate
// x & y, recorded in localStorage;
function checkForIntersect(counter, scrollThrough){

  // capture x, y, tx, ty, w, h specs for each element of the supplied counter
  // if the supplied counter is for gardens, the elt will contain garden specs
  // and the clickedGroup is a plant and vice versa
  let specs = {};
  counter.forEach(elt => {
    let ls = localStorage.getItem("aas_myGardenVs_"+scrollThrough+elt).split(",");
    specs[elt] = {
      id:elt,
      x:Number(ls[0]),
      y:Number(ls[1]),
      w:Number(ls[2]),
      h:Number(ls[3]),
      g:ls[5]
    }
  });

  //loop through specs' elements, captured from counter
  for (elt in specs) {
    let plant = null, garden = null;

    //a PLANT is moved around, check its intersection with gardens
    if (scrollThrough === "grdn") {
      plant = {
        x:Number(clickedGroup.children[0].getAttribute("x"))
         +clickedGroup.transform.baseVal.getItem("translate").matrix.e,
        y:Number(clickedGroup.children[0].getAttribute("y"))
         +clickedGroup.transform.baseVal.getItem("translate").matrix.f
      };
      garden = {
        x:specs[elt]["x"],
        y:specs[elt]["y"],
        w:specs[elt]["w"],
        h:specs[elt]["h"],
        id:"g_" + specs[elt]["id"]
      }

      // if a moved plant is already in a garden, remove parent's tx/ty to get plant's true coordinates
      if (clickedGroup.parentElement.id[0] === "g") {
        plant.x += clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.e;
        plant.y += clickedGroup.parentElement.transform.baseVal.getItem("translate").matrix.f;
      }

      // if a plant's location overlaps with a garden
      if (plantOverlapsGarden(plant, garden)){
        addPlantToGarden(clickedGroup, svgPlace.getElementById("g_"+elt));
        return;
      }
      // if a plant has been moved out of a garden and not placed into a new garden,
      // meaning its gId is still equal to id of garden that it's not in, remove it
      else if (clickedGroup.parentElement.id === "g_"+elt) {
        removePlantFromGarden(clickedGroup, svgPlace.getElementById("g_"+elt));
      }
    }

    // a GARDEN is moved around - it moves the plants with it, so only need
    // to check if a new plant has been added to a garden during the move or
    //if a garden has lost some plants during resizing
    else {
      plant = {
        x:specs[elt]["x"],
        y:specs[elt]["y"],
//         tx:specs[elt]["tx"],
//         ty:specs[elt]["ty"],
        gId:specs[elt]["g"]
      };
      garden = {
        x:Number(clickedGroup.children[0].getAttribute("x"))
         +clickedGroup.transform.baseVal.getItem(0).matrix.e,
        y:Number(clickedGroup.children[0].getAttribute("y"))
         +clickedGroup.transform.baseVal.getItem(0).matrix.f,
        w:Number(clickedGroup.children[0].getAttribute("width")),
        h:Number(clickedGroup.children[0].getAttribute("height"))
      }

      if (plant.gId[0] === "g") {
        plant.tx += garden.tx;
        plant.ty += garden.ty;
      }

      // if a garden(clickedGroup) is moved or resized to include a plant
      // (elt), that isn't already a part of a garden, add it to the garden
      if (plant.gId === "0" && plantOverlapsGarden(plant, garden)){
        addPlantToGarden(svgPlace.getElementById("p_"+elt), clickedGroup);
      }
      // otherwise, only when resizing, remove the plants that have been in the
      // garden, if they're being left out during resize; during moving, the
      // plants will remain in the garden;
      else if (plant.gId === clickedGroup.id && resize && !plantOverlapsGarden(plant, garden)) {
        removePlantFromGarden(svgPlace.getElementById("p_"+elt), clickedGroup)
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////
function plantOverlapsGarden (plant, garden) {
  if (plant.x >= garden.x
     && plant.y >= garden.y
     && plant.x <= garden.x + garden.w
     && plant.y <= garden.y + garden.h
    ){ return true; }
  else { return false; }
}

//////////////////////////////////////////////////////////////////////
// when a plant is moved into a garden,
// its translate x/y are adjusted by garden's
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
    updateLocalStorage(plant.id, "gardenId", garden.id);
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
  updateLocalStorage(plant.id, "gardenId", 0);
  //update clicked plant's tx & ty in local storage
  updateLocalStorage(plant.id, "tx", plant.transform.baseVal.getItem("translate").matrix.e);
  updateLocalStorage(plant.id, "ty", plant.transform.baseVal.getItem("translate").matrix.f);
  //clear the garden's id from the plant's gId in localStorage
  updateLocalStorage(plant.id, "gardenId", 0);
}

//////////////////////////////////////////////////////////////////////
//response to key up (escape and alike), this hides drop down menus
function tapClickKey(evt) {
  // garden name change is flagged on mouse/tap up; on key
  // up, name change is recorded in local storage, item 6
  if (evt.target.parentElement.classList.contains("editable")) {
    let gardenName = evt.target.value;
    if (gardenName.indexOf(", ") > -1) {
      //replace commas with double semi-columns so that it doesn't break split by comma
      gardenName = gardenName.replaceAll(",", ";;");
    }
    updateLocalStorage(evt.target.parentElement.parentElement.id, "name", gardenName);
  }

  if (evt.keyCode){
    // if return or escape are clicked
    if (evt.keyCode === 13 || evt.keyCode === 27){
      hideDropDown();
      evt.target.blur();
    }
    // if delete/backspace or clear are clicked
    if (evt.keyCode === 8 || evt.keyCode === 12){
      hideDropDown(evt);
    }
    else if (evt.keyCode >= 65 && evt.keyCode <= 90) {
      scrollToLetter(evt.keyCode)
    }
  }
}

//////////////////////////////////////////////////////////////////////
// return the styling of garden name back to normal, when the user is done changing it
function focusOut(tgt) {
  if (tgt.parentElement.classList.contains("editable")) {
    tgt.style.fontSize = "14px";
  }
}

//////////////////////////////////////////////////////////////////////
// this function is triggered by double click, set in html SVG element
function dblTouch(evt) {
  // clear any selected items as none are needed if not in an input field
  if (evt.target.tagName != "INPUT") window.getSelection().removeAllRanges();

  // if an editable name field is double-clicked on the garden, leave this module, cause it's a name change and not an intent to delete a garden
  if (evt.target.id != "svgArea"
      && !evt.target.classList.contains("plant")
      && !evt.target.classList.contains("garden")) {
    return;
  }

  // if double clicked in SVG area display the add garden/plant menu
  if (evt.target.id === "svgArea") {
    // create menu values
    const mos = new Date;
    const vals = ["New\xa0Garden", "New\xa0Plant",
                "Plant\xa0in<span>\xa0<-\xa0</span>" +
                mos.toLocaleString('default', {month:"short"}) +
                "<span>\xa0-></span>"];
    if (localStorage.aas_myGardenVs_grdns) {vals.push("Delete\xa0All\xa0Gardens")};
    if (localStorage.aas_myGardenVs_plnts) {vals.push("Delete\xa0All\xa0Plants")};

    const dropDownMenu = getUL(menu = {
      values: vals,
      xPos: (evt.pageX-5),
      yPos: (evt.pageY-40)
    });
    dropDownMenu.addEventListener("click", function() {
      addGardenPlantUL();
    });
    document.body.appendChild(dropDownMenu);
    return;
  }

  // if warnings are on, confirm the deleting of the plant or garden
  if (evt.target.parentElement.id[0] === "p") {
    if (!Number(localStorage.getItem("aas_myGardenVs_warnings"))) {
      const plantNameToRemove = evt.target.childElementCount
        ? evt.target.children[0].textContent
        : evt.target.textContent;
      if (!confirm(`Would you like to remove ${plantNameToRemove}?`)) {
        return;
      }
    }
  } else if (evt.target.parentElement.id[0] === "g") {
    if (evt.target.parentElement.id[0]==="g" &&
      !Number(localStorage.getItem("aas_myGardenVs_warnings"))) {
      if (!confirm(`Would you like to remove ${evt.target.parentElement.getElementsByClassName("editable")[0].children[0].value} and all its plants?`)) {
        return;
      }
    }
  }
  // delete the plant/garden and clear clickedGroup
  del(evt.target.parentElement);
  hideDropDown();
  clickedGroup = null;
}

//////////////////////////////////////////////////////////////////////
// delete the supplied element from html and local storage
function del(elt) {
  // if the element is a garden with plants, remove the plants from local storage first
  if (elt.id[0] === "g") {
    const plants = elt.getElementsByTagName("g");
    for (let i = 0, len = plants.length; i < len; i++) {
      removeFromLocalStorage(plants[i].id);
    }
  }
  // next remove the element from html (if a garden, plants will be deleted as part of garden's group)
  elt.parentElement.removeChild(elt);
  // finally, remove the element from local storage
  removeFromLocalStorage(elt.id);
}

//////////////////////////////////////////////////////////////////////
// this function deletes a garden or plant from local storage using
// supplied pGrp (plnt or grdn) and the numeruc id (pId)
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
// this function updates the localStorage plant or garden data based on
// the id supplied in chgId with the value val at index position ind
function updateLocalStorage(chgId, field, val){

  //ind is the position of the data fields in the localStorage string
  let ind = null;

//4 - garden or plant common name, 5 - sun for a garden or garden id for a plant, 6 - soil for garden or latin name for plant, 7 - shape group number & leaf retention letter (e,s,d)
  const storageFields = {'x':0, 'y':1, 'w':2, 'h':3, 'name':4, 'sun':5, 'gardenId':5, 'soil':6, 'latinName':6, 'shape':7, 'color':8};

  //if the value is a float, for x, y, w, h, limit the number of stored decimals to 2
  if (['x','y','w','h'].includes(field)) {
    if (!isNaN(val)) {
      val = val.toFixed(2);
    }
  }
  const idPrefix = chgId.toString()[0] === "p" ? "plnt" : "grdn";
  //retrieve the entry from local storage, update the value at the requested index, load back to local storage
  const currData = localStorage.getItem("aas_myGardenVs_"+idPrefix+chgId.slice(2)).split(",");
  currData[storageFields[field]] = val;
  localStorage.setItem("aas_myGardenVs_"+idPrefix+chgId.slice(2), currData);
}

//////////////////////////////////////////////////////////////////////
function hideDropDown() {
  // check if there is already a dropDown menu and remove it
  // there should only be one dropDown menu at a time, unless
  // it's addition of a new plant menu, which has other menus
  // the dropDown class is applied to settings, add garden/plant, and add a plant UL menus
  const dropMenus = document.getElementsByClassName("dropDown");

  for (let i = 0, len = dropMenus.length; i < len; i++ ) {
    dropMenus[0].remove();
  }

  // check and hide plant info boxes:
  const plantInfoBoxes = document.getElementsByClassName("plantDetails");
  len = plantInfoBoxes.length;
  if (len) {
    for (let j = 0; j < len; j++) {
      plantInfoBoxes[0].remove();
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
