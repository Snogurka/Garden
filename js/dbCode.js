/********** v.7.4.3 **********/
/*
DONE:
 - changed from XmlHttpRequest to fetch promise
 - common name column resizing - mobile test
*/

/* #################
   ### IMPORTANT ###
   #################
 - in this script, a plain ID number is reserved for IDs for plants (rows) added by a user;
 - for efficiency, editable contents columns support is designed around the order of those columns, 
 - those are columns Notes (3rd column, index 2, in JSON 1), Action (4th, 3, 2), In Garden (14th, 13, 12)
 - should the column order change, update the code in allClicks(), used to be addBtnUsrChgs(),
 - & appendPlantToTable() as well as visual.js code accordingly
*/

  var table = document.getElementById("plants");
  var addedRowCounter = []; //used for accessing added plants, a unique number for each
  var latinNamesAdded = []; //stores the latin names of added plants to avoid storing duplicates
  var filters = {}; //filters{} is a global var to support filtering multiple columns; 
  var newRow = null;
  var arrHeaders = [];
  //resizing columns
  var pageX, curCol, curColWidth;

  window.onload = main();

//////////////////////////////////////////////////////////////////////
// this function is called from html file on window load to pull data from plant.json file
function main() {
  fetch('plants.json')
    .then(function(resp){
    return resp.json()  
  }).then(function(json){
    putDataInTable(json);
  }).catch(function(err){
    console.log("Issue fetching data, " + err.message);
  })
  
}

//////////////////////////////////////////////////////////////////////
// add data pulled from plants.json to the table;
// call other functions to check local storage for user added plants; 
// check session storage for filtered plants and hidden columns;
function putDataInTable(json) {
  let objNotes = null,
  objAction = null,
  objInGarden = null;
  let myObj = json;

  //start the text string to contain the body of the html table
  let txt = "<tbody>";
  //l = number of columns
  let l = myObj[Object.keys(myObj)[0]].length;
  //k = Latin Name, the name of the key column in headers (first) JSON object entry 
  let k = Object.keys(myObj)[0];

  //build the HEADERS row
  //latin name is the key, common name - 1st value index 0, notes - 2nd index 1, etc.
  txt += "<tr title='Click to Sort'>";

  for (let i = 0; i < l; i++) {
    //record column names in a var, replacing html nonbreaking space with js one
    arrHeaders.push(myObj[k][i].replaceAll("&nbsp","\xa0"));      

    //latin name is added separately cuz it's the key and only needs to be added
    //once, thus it's here, combined with common name
    if (i === 0) {
      //replace nbsp for latin name value
      arrHeaders.push(k.replaceAll("&nbsp","\xa0"));

      //Common Name column header
      txt += `<th class='frozenCol colWidth2' style='z-index:3;'>${myObj[k][i]}`;
      //add resizing support to the common name column
      txt += "<div class='resizable'></div>";
      txt += "</th>";

      //Latin Name column header
      txt += `<th class='colWidth2'>${k}`;
    }

    //Notes column header - add unique title, column width is wide
    else if (i === 1){
      txt += `<th class='colWidth3' title='This column is editable.'>${myObj[k][i]}`;
    }

    //Action column header - add unique title, column width is narrow
    else if (i === 2){
      txt += `<th class='colWidth1' title='This column is editable.'>${myObj[k][i]}`;
    }

    //Leaves column header - add unique title, column width is narrow
    else if (i === 7){
      txt += `<th class='colWidth1' title='Semi-evergreen keeps its leaves through winter in warmer climates. Annuals reseed every year, while perennials are like decidious and loose their leaves in winter, then come back in spring.'>${myObj[k][i]}`;
    }

    //Sun column header - add unique title, column width is narrow
    else if (i === 10){
      txt += `<th class='colWidth1' title='Full: 6 or more hours of sun a day, part sun or part shade: 3-6 hours a day, shade: less than 3 hours of sun.'>${myObj[k][i]}`;
    }

    //'In Garden' column header - add unique title, column width is medium
    else if (i === 12){
      txt += `<th class='colWidth2' title='This column is editable.'>${myObj[k][i]}`;
    }

    //Soil column header - add unique title, column width is narrow
    else if (i === 19){
      txt += `<th class='colWidth1' title='Soil pH: circumneutral - near neutral, ph 6.8-7.2, acidic - below 6.8, alkaline - above 7.2. Moisture: hydric - abundant, mesic - moderate, xeric - dry.'>${myObj[k][i]}`;
    }

    //'When To Plant' column header - add unique title, column width is medium
    else if (i === 21){
      txt += `<th class='colWidth2' title='In NC, first frost is in early Nov, last frost is in early Mar.'>${myObj[k][i]}`;
    }

    //'Days To' column header - add unique title, column width is medium
    else if (i === 22){
      txt += `<th class='colWidth2' title='Days To... g: germination, h: harvest, m: maturity.'>${myObj[k][i]}`;
    }

    //narrow column headers, colWidth1
    else if ([3, 4, 5, 6, 7, 11, 14, 15, 28, 29].includes(i)){
      txt += `<th class='colWidth1'>${myObj[k][i]}`;
    }
    //medium size column headers, colWidth2
    else if ([8, 9, 17, 18, 24, 26, 27].includes(i)){
      txt += `<th class='colWidth2'>${myObj[k][i]}`;
    }
    //wide column headers, colWidth3
    else if ([13, 16, 20, 23, 25].includes(i)){
      txt += `<th class='colWidth3'>${myObj[k][i]}`;
    }
    //headers for all other columns, which there shouldn't be any at this point
    else {
      txt += `<th>${myObj[k][i]}`;
    }
    //add an eye icon to each (except common name, it can be resized instead)
    txt += "<i title='Hide this column' class='fas fa-eye'></i></th>"
  }
  txt += "</tr>";

  //build the FILTERS row
  txt += "<tr>";
  for (let i = 0; i <= l; i++) {
    //common name column
    if (i === 0) {
      //"filterFreeze" is a filter cell for the common name column only
      txt += "<td class='filterFreeze'> " + 
        "<input autocorrect='off' type='text' class='filterInput' placeholder='filter by ...'> " + 
        "<button class='btnInner btnLeft' title='Filter by " + myObj[k][0].replace("&nbsp"," ") +  "'> " + 
        "<img class='btnImg' src='pictures/btnLeafDown.png' border=0></button></td>";
    }
    //if the last column, picture, don't need the drop down filtering button
    else if (i === (l)) {
      txt += "<td class='frozenFilterRow'></td>";
    }
    //all other columns
    else {
      txt += "<td class='frozenFilterRow'><input type='text' class='filterInput'> ";
      if (i === 1) {
        txt += "<button class='btnInner btnLeft' title='Filter by " + k.replace("&nbsp"," ") +  "'>";
      } 
      else {
        txt += "<button class='btnInner btnLeft' title='Filter by " + myObj[k][i-1].replace("&nbsp"," ") +  "'>";
      }
      txt += "<img class='btnImg' src='pictures/btnLeafDown.png' 'border=0'></td>";
    }
  }
  txt += "</tr>";
  //remove the headers from myObj, since the headers are now recorded 
  //and it's not needed for looping through data rows
  delete myObj[k];

  //build the REST OF THE TABLE
  //loop through every row object of data returned from JSON as myObj
  //in the myObj, latin name(x) is the key, common name is ind 0, note is 1, etc.
  for (let x in myObj) {

    //add data row <tr> and place a <td> with COMMON NAME in it; 
    txt += "<tr><td class='frozenCol'>" + myObj[x][0] + "</td>"; 

    //if the local storage is available, pull Notes, In Garden, if those exist
    if (typeof (Storage) !== "undefined") {
      try {
        objNotes = JSON.parse(localStorage.aas_myGardenDb_Notes);
      } 
      catch (error) {
        //no Notes in local storage, no problem
      }
       try {
        objAction = JSON.parse(localStorage.aas_myGardenDb_Action); //if stored data is corrupted
      }
      catch (error) {
        //no Action in local storage, no problem
      }
      try {
        objInGarden = JSON.parse(localStorage.aas_myGardenDb_InGarden);
      }
      catch (error) {
        //no In Garden in local storage, no problem
      }
    }

    //loop through the array of objects in JSON object - these become table rows
    for (let i = 0; i < l; i++) {
      switch (i) {
        //Latin Name
        case 0:
          txt += "<td>" + x + "</td>";
          break;
        case 1:
          //store the length of existing notes in notesLen attribute, 
          //used to capture just the user added notes in local storage
          txt += "<td contenteditable=true notesLen='" + myObj[x][i].length + "'>";
          //objNotes - all Notes in local storage
          if (objNotes) {
            //if there is an entry in local storage for the plant
            if (objNotes[x]) {
              txt += myObj[x][i] + " " + objNotes[x];
            } else {
              txt += myObj[x][i];
            }
          } else {
            txt += myObj[x][i];
          }
          break;
        //Action, only load user's saved
        case 2:
          txt += "<td contenteditable=true>";
          //objAction - all Action in local storage
          if (objAction) {
            if (objAction[x]) {
              txt += objAction[x];
            } else {
              txt += myObj[x][i];
            }
          }
          break;
        //In Garden field, only load user's saved
        case 12:
          txt += "<td contenteditable=true>";
          //objInGarden - all In Garden in local storage
          if (objInGarden) {
            if (objInGarden[x]) {
              txt += objInGarden[x];
            } else {
              txt += myObj[x][i];
            }
          }
          txt += "</td>";
          break;
        //Photo: if value in source file is not 0 then a photo is present: perform, 
        //a lazy load, record the value indicating how many photos are available
        //for the plant, set the source based on the common name with .jpg
        //extension, set the alternative text using the common name
        case (l-1):
          if (myObj[x][i] === "0") {
            txt += "<td><img src='pictures/btnCog.png' " 
              + "alt='" + myObj[x][0] + "'"
              + "></td>";
          } else {
            txt += "<td loading='lazy'>"
              + "<img class='pic' " 
              + "value = '" + myObj[x][i] + "' "
            //remove spaces, dashes, quotes, v., (), & from the plants' names
              + "src='pictures/" + myObj[x][0].replace((/( |-|\(|\)|v\.|&|\"|\')/g),"") + "1.jpg' " 
              + "alt='" + myObj[x][0] + "' "
            //saving some good code to handle errors in images
//                   + "onerror='this.onerror=null; this.src=\"pictures/btnCog.png\"' "
              +"></td>";
          }
          break;
        //All other columns
        default:
          txt += "<td>" + myObj[x][i] + "</td>";
          break;
      }
    }
    txt += "</tr>";
  }
  //add NEW PLANT ROW, used for entering new plants
  txt += "<tr id='newPlantRow' contenteditable=true>"//blank cell <td> for the latin name
  //blank cell for common name is special, containing a div/text plus editing buttons
  txt += "<td class='frozenCol'><div contenteditable=true></div>"
  txt += "<button id='btnNewPlantCopy' class='btnInner btnLeft' title='Copy an existing plant to modify and add a new entry'>"
    txt += "<img class='btnImg' src='pictures/btnLeafDown.png'></button>"
  txt += "<button id='btnNewPlantClear' class='btnInner' title='Clear this row'>"
    txt += "<img class='btnImg' src='pictures/btnCut.png'></button>"
//         txt += "<i class='fas fa-cut'></i></button>"
//       txt += "<button id='btnNewPlantSubmit' class='btnInner' title='Request addition of your plant to the database'>"
//         txt += "<img class='btnImg' src='pictures/btnShovel.png'></button>"
  txt += "<button id='btnNewPlantAdd' class='btnInner' title='Add your new plant'>"
    txt += "<img class='btnImg' src='pictures/btnShovel.png'></button>"
  txt += "</td>";
  //remaining blank cells for all columns other than common name (above) and picture (below)
  for (let i = 1; i < l; i++) {
    txt += "<td></td>";
  }
  //blank cell for the picture cell
  txt += "<td title='The upload image functionality is not yet available'>image</td></tr>"
  txt += "</tbody>"
  txt += "</table>"
  table.innerHTML += txt;

  //if storage is available, add storage features and retrieve
  //session variables: filered rows and hidden columns
  if (typeof (Storage) !== "undefined") {

    addStorageFeatures();

    //if data has been filtered in this session and filters are stored in session storage, 
    //retrieve them and filter the table rows
    if (sessionStorage.filters) {
      filters = JSON.parse(sessionStorage.filters);
      for (i in filters) {
        //min/max height and width support
        if (filters[i][">"]) {
          table.children[0].children[1].children[i].children[0].value =
          filters[i][">"] + "-" + filters[i]["<"];
          filterData();
        }
        else {
          //if more than one filter choice
          if (Array.isArray(filters[i]) && filters[i].length > 1) {
            table.children[0].children[1].children[i].children[0].value = "...";
            } 
          //else, if one filter choice
          else {
            table.children[0].children[1].children[i].children[0].value = filters[i].toString().toLowerCase();
          }
          filterData();
        }
        addClearingBtn(table.children[0].children[1].children[i]);
      }
    }

    //creating the column drop down menu, used in custom view
    addDropDown("dropColNames", arrHeaders);

    //adding export/import menu sub choices here just to keep it together
    //the Export/Import are separated from the rest of the choice name by no space 
    //on purpose, this is used later in code, the rest needs to not be \xa0
    addDropDown("dropExportImport",
    ["Export\xa0Notes", "Export\xa0Action", "Export\xa0In Garden", 
    "Import\xa0Notes", "Import\xa0Action", "Import\xa0In Garden"]);

    //check the view type in session storage and adjust the view if needed
    //full view is not stored, thus for it the following clause is skipped
    if (sessionStorage.hiddenColumns) {
      //if there are hidden columns, update the View Button's text;
      document.getElementById("btnView").innerText = sessionStorage.viewName;
      let hiddenCols = sessionStorage.hiddenColumns.split(",");
      //format the column names in the dropdown
      for (let i = 0, l = arrHeaders.length; i < l; i++) {
        //if the column is listed in sessionStorage.hiddneColumns, hide that column
        if (hiddenCols.includes(arrHeaders[i])) {//} .replace(" ","\xa0"))) {
          customColumnDisplay(i, false);
        }
      }
      $("#btnCustomCols").show();
    }
  }
} 

//////////////////////////////////////////////////////////////////////
//click on one of Export/Import choices (in settings (cog, top left), Export/Import menu)
function impExp(tgt) {
  //split the text of clicked choice into specs [action, column]
  let specs = tgt.innerText.split("\xa0");

  //create a div to hold the text area and the "done" button
  let displayDiv = document.createElement("div");
  displayDiv.className = "expImp";
  document.body.appendChild(displayDiv);

  //create the text area for the input or output data
  let displayTextArea = document.createElement("textarea");
  displayTextArea.cols = "20";
  displayTextArea.rows = "10";
  displayDiv.appendChild(displayTextArea);
  
  //cancel button closes the window
  let displayCancelBtn = document.createElement("button");
  displayCancelBtn.innerText = "x";
  displayCancelBtn.className = "expImp btnRight btnInner";
  displayCancelBtn.title = "Click to Close";
  displayDiv.appendChild(displayCancelBtn);

  let displayDoneBtn = document.createElement("button");
  let img = document.createElement("img");
  img.className = "btnImg";
  displayDoneBtn.appendChild(img);
  displayDoneBtn.className = "btnLeft btnInner";
  displayDiv.appendChild(displayDoneBtn);
  
  //on export, get the data from local storage, clean & display it in the text area; 
  if (specs[0] === "Export") {
    displayTextArea.className = "exp";
    displayDoneBtn.classList.add("exp");
    img.src = 'pictures/btnCut.png';
    let data = JSON.parse(localStorage.getItem("aas_myGardenDb_" + specs[1].replace(/ /g, "")));
    if (!data) {
      displayTextArea.placeholder = "You don't have any "+specs[1]+" stored in Local Storage";
      return;
    }
    displayTextArea.value = specs[1]+'\n"';
    let i = 0;
    for (x in data) {
      //the last entry is treated differently: it's removed because it's an empty string
      if (i === Object.entries(data).length-1) {
        displayTextArea.value += x+'":"'+data[x].replace(/\n/g,"").substring(0,data[x].length)+'"';
      }
      //for all entries, other than last one, remove trailing new line characters, 
      //replace " with ' and append ", followed by new line and " at the end
      else {
      displayTextArea.value += x+'":"'+data[x].replace(/\n/g,"").replace(/"/g, "'")+'",\n"';
      }
      i++;
    }
    //update assisting text for done button
    displayDoneBtn.title = "Click to copy the text and close this window. "
      +"Once copied, the text can be uploaded to this page on another devise. "
      +"A portable drive, email or other means can be used to move this text from this "
      +"device to another. When importing the data, reload the page to view changes.";
  }

  //else, import is clicked; the data is pasted or entered by the user into the window;
  //the data must be in the correct format: "name":"text"
  //the functionality below is added to the button to clean up and load the 
  //data to local storage; the page is then refreshed to display the additon
  else {
    displayTextArea.className = "imp";
    displayDoneBtn.classList.add("imp");
    //hide the button until the correctly formatted text entry is made
    displayDoneBtn.style.display = "none";
    //the value reflects notes, action or location
    displayDoneBtn.value = specs[1];
    img.src = 'pictures/btnShovel.png';
    //update assisting text for the text area
    displayTextArea.placeholder = "Paste the " + specs[1] + " data here. The data copied from "
    + "this page on another device is in the required format: \"Latin Name\":\"" + specs[1] + " text\". ";
  }
}

//////////////////////////////////////////////////////////////////////
//check if localStorage is supported by user's browser; only if yes, 
//add the new plant row, giving user the ability to add new plant data
function addStorageFeatures() {
  //the following try/catch block pulls saved added plant data or informs the
  //user that local file restrictions are not disabled and data won't be saved
//   if (typeof (Storage) !== "undefined") {
  let addPlantInfo = document.getElementsByClassName("addPlant");
  try {
    // a new row is preloaded at the end of the table to allow addition of new data to be stored on a user's machine
    newRow = document.getElementById("newPlantRow");
    //display the blank row for adding new plants; variable newRow is declared in the script section of html file
    newRow.style.visibility = "visible";
    //display new data buttons optionality
    addPlantInfo[0].style.display = "inline";
    //disable user from editing within new plant's Common Name field, preventing
    //them from deleting buttons etc. and only allowing clicking buttons and
    //entering text within input field, which is a child of Common Name field
    newRow.children[0].contentEditable = false;
    
    //check for user-created plants stored in local storage and append them to the table
    checkStoredData();
  }
  catch (error) {
    console.error(error);
    addPlantInfo[0].children[0].innerText = "Local storage is not available on this machine. "
    + "The local file restrictions might be on. Disable at your own risk.";
  }
//   }
}

//////////////////////////////////////////////////////////////////////
//check if data's been added by the user and, 
//if yes, append it to the table;
function checkStoredData() {
  // if the existing row counter is retrieved, it is recorded in the addedRowCounter variable
  let plantCounter = localStorage.getItem("aas_myGardenDb_rPlntsCntr");
  if (plantCounter === "undefined" || plantCounter === null || plantCounter === "") {
    // if rPlntsCntr has not been set in local storage before, there is no 
    // existing data to pull, thus return
    return;
  } else {
    // the addedRowCounter is an array variable that stores the rows that have 
    // been added by a user to their local storage
    addedRowCounter = plantCounter.split(",");
  }
  //the following for loop goes through saved plants added by user;
  //here, i is the row record number that's used in the triggered
  //appendPlanToTable() function to pull stored plants using their keys
  for (let i = 0, len = addedRowCounter.length; i < len; i++) {
    //once the data is pulled from local storage, append it to the table
    //loop through each of plant data array elements
    appendPlantToTable(addedRowCounter[i]);
  }
}

//////////////////////////////////////////////////////////////////////
//this function appends new row(s) to the table with stored or new plant's data
function appendPlantToTable(iD) {
  
  //retrieve user created plants from local storage
  let arrStoredPlant = localStorage.getItem("aas_myGardenDb_plnt" + iD);
  if (arrStoredPlant) {
    arrStoredPlant = JSON.parse(arrStoredPlant);
  }
  
  // insert a new row at the bottom of the table, but before
  // the very last row, dedicated for adding new data
  let row = table.insertRow(table.rows.length - 1);
  
  // assign class addedRow to the rows added by user, so that they can be accessed for editing
  row.className = "addedRows";
  row.id = iD;
  
  // on key up, add an 'update' button to the common name field of a user 
  // added plant; if the number of children is 3, the button's already added
  // todo: consider getting rid of this functionality and always display the edit and delete buttons
  row.addEventListener("keyup", function() {
    if (row.children[0].childElementCount < 3) {
      row.children[0].appendChild(addInnerButton('u', addedRowCounter[iD]));
    }
  });
  
  //write the user added plants data into the table
  for (let j = 0, len = table.rows[0].cells.length; j < len; j++) {

    let newCell = row.insertCell(j);

    //special treatment of index 0, common name, as it is frozen and
    //has inner buttons to allow editing and removal of added plants
    if (j === 0) {
      newCell.className = "frozenCol";
      let newDiv = document.createElement("div");
      newDiv.contentEditable = "true";
      newDiv.appendChild(document.createTextNode(arrStoredPlant[1]));
      newCell.appendChild(newDiv);
      // add a delete button to common name cell
      newCell.appendChild(addInnerButton('d', addedRowCounter[iD]));
    } 
    //latin name
    else if (j === 1) {
      //latin name (index 0) is recorded in an latinNamesAdded array; 
      //new entries are verified against this array to avoid duplicates;
      latinNamesAdded.push(arrStoredPlant[0]);
      newCell.contentEditable = "true";
      newCell.appendChild(document.createTextNode(arrStoredPlant[0]));
    }
    else {
      // add the text node to the newly inserted row's each cell
      newCell.appendChild(document.createTextNode(arrStoredPlant[j]));
      newCell.contentEditable = "true";
    }
  }
}

//////////////////////////////////////////////////////////////////////
//this function allows users to add their new plant data. this functionality is only available
//if the user's browser supports localStorage and restrictions are disabled.
function storeNewPlant() {
  // check if the latinNamesAdded array already has the latin name that the user wants to add
  if (latinNamesAdded.indexOf(newRow.children[1].textContent) > -1) {
    alert("A plant with this latin name is already stored in your dataset.");
    return;
  } else if (newRow.children[0].textContent.length === 0 && newRow.children[1].textContent.length === 0) {
    alert("Please provide a common name or a latin name for your plant.");
    return;
  }
  let recordNumber = 0;  
  // if the length of addedRowCounter is not 0 and addedRowCounter exists, set the record
  // number to the VALUE of the last element (length minus one) in the addedRowCounter plus one. 
  if (addedRowCounter) {
    if (addedRowCounter.length > 0) {
      recordNumber = Number(addedRowCounter[addedRowCounter.length - 1]) + 1;
    }
  }
  //update the addedRowCounter - an array that keeps track of user added plants
  addedRowCounter.push(recordNumber.toString());
  localStorage.setItem("aas_myGardenDb_rPlntsCntr", addedRowCounter);

  //when a plant is added to local, it's stored in the original order, latin name before common
  addToLocal(newRow, recordNumber);
  appendPlantToTable(recordNumber);
  //hide any hidden columns for the newly added plants
  if (sessionStorage.hiddenColumns) {
    let newRow = document.getElementById(recordNumber);
    let ulColNames = document.getElementById("dropColNames");
    let hiddenCols = sessionStorage.hiddenColumns.split(",");
    for (let i = 0, l = ulColNames.childElementCount; i < l; i++) {
      if (hiddenCols.includes(ulColNames.children[i].innerText)) {
        newRow.children[i].style.display = "none";
      }
    }
  }
  
  clearNewPlant();
}

//////////////////////////////////////////////////////////////////////
//this function adds the data to local storage (updates or adds new)
//ensuring the data is in the right order
function addToLocal(row, recordNumber) {
  if (recordNumber === undefined) recordNumber = row.id;
  
  //the following array is a list of column names in their original order;
  //it is used so that column names aren't stored with every plant row;
  //instead, the columns and headers order is matched;
  let origTblHeaders = ['Latin\xa0Name','Common\xa0Name','Notes','Action','Class',
                        'Height','Width','Color','Leaves','Bloom\xa0Time','Fruit\xa0Time',
                        'Sun','Roots','In\xa0Garden','Season','Natural\xa0Habitat',
                        'Origin','Wildlife','Companions','Ally','Enemy','Soil',
                        'When\xa0To\xa0Plant','Days\xa0To...','How\xa0To\xa0Prune',
                        'When\xa0To\xa0Prune','Food\xa0And\xa0Water','How\xa0To\xa0Plant',
                        'When\xa0To\xa0Feed','Propagating','Problems','Picture'];

  let arrNewPlantVal = [];
  //record new plant's values in an array
  for (let i = 0; i < arrHeaders.length; i++) {
    //for the common name (index 0), the text is inside the div inside td
    if (i === 0) {
      arrNewPlantVal.push(row.children[i].childNodes[0].textContent.toString());
    }
    //for photo, place 0 until the functionality to upload photos is ready
    else if (i === arrHeaders.length - 1) {
      arrNewPlantVal.push("0");
    }
    else {
      arrNewPlantVal.push(row.children[i].textContent.toString());
    }
  }
  //Note: if the column names are ever modified, an old/new key conversion table would have to be created.
  let arrStoredNewPlantVal = [];
  //arrange the new plant's values in the order of original headers and store that in an array
  for (let i = 0; i < arrHeaders.length; i++) {
    if (arrHeaders.indexOf(origTblHeaders[i]) > -1) {
      arrStoredNewPlantVal.push(arrNewPlantVal[arrHeaders.indexOf(origTblHeaders[i])]);
    } 
    else {
      console.log("Unable to find the original table header name. Check if table headers have been modified and not updated in function addToLocal().");
    }
  }
  localStorage.setItem("aas_myGardenDb_plnt" + recordNumber, JSON.stringify(arrStoredNewPlantVal));
}

//////////////////////////////////////////////////////////////////////
//when changes are made to a user-added plant, this function updates
//the local storage and the table with those changes
function saveEditedPlant(callingRow) {
  
  //first, record the new plant in the local storage
  addToLocal(callingRow, callingRow.id);
  
  //next, update the table with the new plant, pulling the new data from local storage
  appendPlantToTable(Number(callingRow.id));
  
  //last, clear the row for adding new plants
  callingRow.remove();
}

//////////////////////////////////////////////////////////////////////
//triggered when the delete button is clicked in the new plant row, 
//this function starts the process of deleting a user-added plant
function removeAddedPlant(callingRow) {
  if (!confirm("Please confirm the removal of your added plant.")) {
    return;
  }
  
  // delete plant's id from addedRowCounter
  let index = addedRowCounter.indexOf(callingRow.id);
  if (index > -1) {
    addedRowCounter.splice(index, 1);
  }
  
  // delete the plant entry from local storage
  localStorage.removeItem("aas_myGardenDb_plnt" + callingRow.id);
  
  // update the row counter in local storage
  if (addedRowCounter.length > 0) {
    localStorage.setItem("aas_myGardenDb_rPlntsCntr", addedRowCounter);
  } else {
    localStorage.removeItem("aas_myGardenDb_rPlntsCntr");
  }
  // delete the row from the table
  callingRow.remove();
  //remove from latinNamesAdded
  latinNamesAdded.splice(latinNamesAdded.indexOf(callingRow.children[1].innerText), 1);
}

//////////////////////////////////////////////////////////////////////
//this function loops through new plant row emptying user-entered values
function clearNewPlant() {
  for (let i = 0, len = table.rows[0].cells.length; i < len; i++) {
    if (i === 0) {
      //common row's special treatment, as the text is inside a childNode (div) 
      newRow.children[i].childNodes[0].innerText = "";
    } else {
      newRow.children[i].innerText = "";
    }
  }
}

//////////////////////////////////////////////////////////////////////
//add mini buttons update(u) and delete(d) functionality 
//inside the common name cells of plants added by user
function addInnerButton(type) {
  let btn = document.createElement("button");
  btn.className = "btnInner";
  let img = document.createElement("img");
  img.className = "btnImg";
  if (type === 'd') {
    btn.classList.add("btnRight");
    btn.title = "Delete";
    img.src = 'pictures/btnCut.png';
    btn.addEventListener("click", function() {
      removeAddedPlant(this.parentElement.parentElement);
    });
  } else if (type === 'u') {
    btn.classList.add("btnLeft");
    btn.classList.add("btnUpdatePlant");
    btn.title = "Update";
    img.src = 'pictures/btnWaterCan.png';
    btn.addEventListener("click", function() {
      saveEditedPlant(this.parentElement.parentElement);
    });
  }
  btn.appendChild(img);
  return btn;
}

//////////////////////////////////////////////////////////////////////
//this function is triggered on key up within the body of the table
//it adds buttons to the common name of a plant whose notes, action
//or in garden fields are being modified
function addBtnUsrChgs(clickedCell) {
//     console.log(`text: ${clickedCell.innerText}, e.type: ${event.type}, key: ${event.key}, code: ${event.keyCode}`);
  // exit, if the user is editing a plant that they've added, text
  // hasn't been entered yet or the cell has just been tabbed into
  if (clickedCell.parentElement.className === "addedRows" 
      || clickedCell.parentElement.id === "newPlantRow"
      //when data is pasted, the cell is blank on key up
      || !(clickedCell.innerText) && event.type != "paste" //&& event.keyCode != 91 
      || [9,16,37,38,39,40].includes(event.keyCode)  //tab,shift,left,up,right,down
//       || event.keyCode === 91 && clickedCell.innerText
     ) {
    return; 
  }
  
  //if there aren't any children (buttons) in the common name column,
  //then create a button for saving user changes and include the 
  //index number of the updated column in the button's value
  if (clickedCell.parentElement.children[0].childElementCount === 0) {
    let btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "btnInner btnLeft btnUpdatePlant";
    btn.title = "Save changes";
    btn.value = clickedCell.cellIndex;
    clickedCell.parentElement.children[0].appendChild(btn);
    let btnImg = document.createElement("img");
    btnImg.className = "btnImg";
    btnImg.src = "pictures/btnWaterCan.png";
    btn.appendChild(btnImg);
  }
  //... if there is already a button in the common name column, then, if not already 
  //included, update the button's value to include the index number of the updated column
  //or remove the button, if the user has deleted or undone all the changes they were typing
  else {
    //the button is in the first column (common name, index 0)
    let btn = clickedCell.parentElement.children[0].children[0];
    //the index numbers of modified columns are stored in button's value
    let arrModifiedCols = btn.value.split(",");
    //if the index of modified column isn't already in the button's value, add it
    if (!arrModifiedCols.includes(clickedCell.cellIndex.toString())) {
      arrModifiedCols.push(clickedCell.cellIndex);
    } 
    //otherwise, if the index of modified column is already in the button's value..
    else {
      //if the remaining text in the cell is a space or a return, replace it with empty quotes
      if ([10,30].includes(clickedCell.innerText.charCodeAt()) || isNaN(clickedCell.innerText.charCodeAt())) {
        clickedCell.innerText = "";
      }
      //..compare user modified text to local storage, ..
      let strStoredText = localStorage.getItem("aas_myGardenDb_" + 
                          table.getElementsByTagName("TH")[clickedCell.cellIndex].innerText.replace(/\s/g,""));
      if (strStoredText) {
        //..if identical or no stored text and the changes are deleted..
        if (clickedCell.innerText === 
            JSON.parse(strStoredText)[clickedCell.parentElement.children[1].innerText]
           || clickedCell.innerText.length === 0 && 
           !(JSON.parse(strStoredText)[clickedCell.parentElement.children[1].innerText])
           ) {
          //remove the index of modified column from button's value
          arrModifiedCols.pop(clickedCell.cellIndex);
        } 
      }
      //no stored text for that entire category and the changes are deleted..
      else if (clickedCell.innerText.length === 0) {
        arrModifiedCols.pop(clickedCell.cellIndex);
      }
    }
    //remove the button if all the indices have been removed from button's value; 
    //the button's value is captured and worked with in the array arrModifiedCols
    if (arrModifiedCols.length === 0) {
      btn.parentElement.removeChild(btn);
    } 
    //otherwise, update button's value to reflect all dirtied column indices
    else {  
      btn.value = arrModifiedCols.toString();
    }
  } 
}

//////////////////////////////////////////////////////////////////////
//this function is called when a user clicks on save changes button 
//within a plant with modified notes, action, or garden location fields
//it loads the modifications into local storage
function updateExistingPlant(btn) {
  //record which column(s) were modified. if more than one, the value will 
  //have the index numbers separated by commas
  let modifiedFields = btn.value.indexOf(",");
  if (modifiedFields > -1) {
    modifiedFields = btn.value.split(",");
  } else {
    modifiedFields = Array(btn.value);
  }
  
  for (let i = 0, l = modifiedFields.length; i < l; i++) {
    let colName = arrHeaders[Number(modifiedFields[i])].replace(/\s/g, "");
    //if this field in question already has entries in local storage, retrieve them; 
    //for columns with spaces in the name, remove nonbreaking spaces \xa0;
    let parsedStoredData = {};
    //parse the results returned from local storage entries
    if (localStorage.getItem("aas_myGardenDb_" + colName)) {
      parsedStoredData = JSON.parse(localStorage.getItem("aas_myGardenDb_" + colName));
    }
    let modifiedText = btn.parentElement.parentElement.children[Number(modifiedFields[i])].innerText;
    //if the user cleared the notes, action, etc., delete that entry
    if (modifiedText.length === 0 || modifiedText === "\n" || modifiedText === "/u21B5") {
      delete parsedStoredData[btn.parentElement.parentElement.children[1].innerText];
    }
    //otherwise, update/create entry with notes, action, or garden q&l, whichever the user is changing
    else {
      let newNotePos = 0;
      if (colName === "Notes") {
        newNotePos=btn.parentElement.parentElement.children[Number(modifiedFields[i])].attributes.notesLen.value;
      }
      parsedStoredData[btn.parentElement.parentElement.children[1].innerText] = modifiedText.slice(newNotePos);
    }
    
    if (Object.entries(parsedStoredData).length === 0) {
      localStorage.removeItem("aas_myGardenDb_" + colName);
    } else {
      localStorage.setItem("aas_myGardenDb_" + colName, JSON.stringify(parsedStoredData));
    }
  }
  btn.parentElement.removeChild(btn);
}

//////////////////////////////////////////////////////////////////////
//this function copies the data of an existing plant into the new  
//plant row for modifying it and saving on user's local machine
function copyRow(clickedElt) {
  let plantName = clickedElt.innerHTML;
  let tr = table.getElementsByTagName("tr");
  let rw = 0; 
  //find the order number of the plant needed by searching for its name
  //(plantName)in the array (tr)
  for (let i = 2, l = (table.rows.length - 2); i < l; i++) {
    if (plantName === tr[i].children[0].innerText) {
      rw = i;
      break;
    }
  }
  clickedElt.parentElement.parentElement.removeChild(clickedElt.parentElement);
  for (let i = 0, l = newRow.children.length; i < l; i++) {
    //the second column (i==0, common name) has input type text and is updated differently
    //add 2 to rw, to account for table headers and filter rows
    if (i === 0) {
      newRow.children[i].childNodes[0].innerText = table.rows[rw].children[i].innerText;
    } else {
      newRow.children[i].innerText = table.rows[rw].children[i].innerText;
    }
  }
  newRow.contentEditable = true;
}

//////////////////////////////////////////////////////////////////////
//this function sorts the data in the table by the clicked column; it's 
//triggered by user clicking on the column header, 1st click: asc, 2nd: desc
function sortTable(colNum) {
	  let i = 0,
        x = 0,
        y = 0,
        xValue = null,
        yValue = null,
        switching = true,
        sortAsc = true;
  //determine whether an ascending or descending sortiing needs to be done
  //by comparing values in the first two rows, more if the first two are the same
  let rowNum = 1;
  do {
    rowNum++; 
    sortAsc = (table.rows[rowNum].children[colNum].innerText > table.rows[rowNum+1].children[colNum].innerText);
  } 
  while (rowNum < (table.rows.length-2) && 
    table.rows[rowNum].children[colNum].innerText === table.rows[rowNum+1].children[colNum].innerText)
    
  // Make a loop that will continue until no switching can be done
  while (switching) {
    // no switching has been done at first
    switching = false;
    let shouldSwitch = false; // there should be no switching at first
    // Loop through all table rows, except the first two that contain table headers and
    // filter fields and the last row, designated for new plant entry
    for (i = 2, l = (table.rows.length - 2); i < l; i++) {
      // Get the two elements to compare, one from current row and one from the next
      x = table.rows[i].getElementsByTagName("td")[colNum];
      y = table.rows[i + 1].getElementsByTagName("td")[colNum];
      //check if the two rows should switch places by looking at text contents of each 
      //cell; the common name of the added plants is treated differently, need to look
      //at the value of the first child[0]
      if (x.className === 'frozenCol' && x.parentElement.className === "addedRows") {
        xValue = (x.children[0].value || x.children[0].textContent).toLowerCase();
      } else {
        xValue = x.textContent.toLowerCase();
      }
      if (y.className === 'frozenCol' && y.parentElement.className === "addedRows") {
        yValue = (y.children[0].value || y.children[0].textContent).toLowerCase();
      } else {
        yValue = y.textContent.toLowerCase();
      }
      if (sortAsc) {
        if (xValue > yValue) {
          // mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      } else {
        if (xValue < yValue) {
          // mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
    }
  //If a shouldSwitch has been marked, make the switch and mark that a switch has been done
    if (shouldSwitch) {
      table.rows[i].parentNode.insertBefore(table.rows[i + 1], table.rows[i]);
      switching = true;
    }
  }
}

//////////////////////////////////////////////////////////////////////
//filtering of the height/width columns' min/max range, special case
function filterBySizeRange(evt) {
  
  let clickedElt = evt.target;
  //forCell is a table data cell <td> of the Frozen Filter Row
  let forCell = clickedElt.parentElement.parentElement.parentElement;

  //create min/max nested entries in filters{} object
  if (!filters[forCell.cellIndex]) {
    filters[forCell.cellIndex] = {
      ">": "",
      "<": ""
    };
  }

  //add the appropriate min/max value entries in the filter{} object for < and > keys
  if (clickedElt.className === "inputRangeMin") {
    filters[forCell.cellIndex][">"] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text")));
  } else if (clickedElt.className === "inputRangeMax") {
    filters[forCell.cellIndex]["<"] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text")));
  }

  filterData();

  //create/update the placeholder which is displayed in the filter cell, put blank when no min/max values
  if (forCell.getElementsByClassName("inputRangeMin")[0].value.length === 0 
      && forCell.getElementsByClassName("inputRangeMax")[0].value.length === 0) {
    forCell.children[0].placeholder = "";
    removeClearingBtn(forCell); //this takes care of sessionStorage too
  } 
  else {
    forCell.children[0].placeholder =
    forCell.getElementsByClassName("inputRangeMin")[0].value
    + "-"
    + forCell.getElementsByClassName("inputRangeMax")[0].value;
    addClearingBtn(forCell);
    sessionStorage.filters = JSON.stringify(filters);
  }
}

//////////////////////////////////////////////////////////////////////
//respomse filtering fields, other than the special min/max range of width/height
function filterByText(evt){
  let clickedElt = evt.target;
  //if a value is typed in a width or height column, clear the placeholder, 
  //which might've been populated before, from using range feature
  if (['Width', 'Height'].includes(arrHeaders[clickedElt.parentElement.cellIndex])) {
    clickedElt.placeholder = "";
  }

  //if a unique to column values dropdown menu is displayed, remove it
  if (clickedElt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
    clickedElt.parentElement.removeChild(clickedElt.parentElement.getElementsByClassName("dropUnqVals")[0]);
  }

  //create/overwrite an entry in filters object with text typed or pasted    
  filters[clickedElt.parentElement.cellIndex] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text"))).toUpperCase();


  //filter the table data; the called function uses filters object, so it must be updated first (above)
  filterData();

  //add the clearing button (scissors) to the filter field
  sessionStorage.filters=JSON.stringify(filters);
  addClearingBtn(clickedElt.parentElement);
}

//////////////////////////////////////////////////////////////////////
//response to the clicks on the filter clearing buttons
function clearFilter(clickedElt) {
  
    let forCell = clickedElt.parentElement;
    let grandpa = forCell.parentElement.parentElement;
    
    //for min/max height/width ranges, remove the emptying button from grandparent & clear placeholder
    if (clickedElt.className === "inputRangeMin") {
      //if only the min value is shown in placeholder, 
      //the dash is the last character, thus clear the placeholder
      let dashPos = grandpa.children[0].placeholder.indexOf("-");
      if (dashPos === grandpa.children[0].placeholder.length-1) {
        removeClearingBtn(grandpa);
        grandpa.children[0].placeholder = "";
      }
      //if the max is also shown in placeholder, then only clear the min
      else {
        grandpa.children[0].placeholder = grandpa.children[0].placeholder.substr(dashPos, grandpa.children[0].placeholder.length-1);
      }
    }
    else if (clickedElt.className === "inputRangeMax") {
      //if only the max value is shown in placeholder, 
      //the dash is the first character, thus clear the placeholder
      let dashPos = grandpa.children[0].placeholder.indexOf("-");
      if (dashPos === 0) {
        removeClearingBtn(grandpa);
        grandpa.children[0].placeholder = "";
      }
      //if the min is also shown in placeholder, then only clear the max
      else {
        grandpa.children[0].placeholder = grandpa.children[0].placeholder.substr(0,dashPos);
      }
    }
    else {
      removeClearingBtn(forCell);
      forCell.children[0].placeholder = "";
      cleanView();
    }
    //call filter data with empty parameters to unfilter the table
    filterData();

}


//////////////////////////////////////////////////////////////////////
//this function is called when a user enters text in the filter (2nd) row
//it filters the rows displayed in the plants table using the text entered
function filterData() {

  //get all table rows 
  let tr = table.getElementsByTagName("tr");
  // loop through all the rows, starting at 3rd row, skipping the headers and filter rows
  for (let i = 2, len = tr.length - 1; i < len; i++) {
    // set the showFlag to true, meaning every row is shown initially
    let showFlag = true;
    // loop through the filters object to check all fields where filtering criteria are set
    for (let key in filters) {
      // i is the row, td is the cell, ("td")[key] is column index, key is the column number
      let td = tr[i].getElementsByTagName("td")[key];
      let cellContents = null;
      // because of the frozenCol class, the common name column's value of the user added plants
      // is inside an input field (child 0), thus has to be accessed through a child's value
      if (key === "1" && td.children.length > 0) {
        cellContents = td.children[0].value;
      } else {
        cellContents = td.textContent;
      }

      //when an entry is made in a height/width min/max fields 
      if (!Array.isArray(filters[key]) && typeof filters[key] === "object") {
        //the values of min & max range fields of width & height have > or < in the value
        if (filters[key][">"]) {
          //check if min width or height is in inches (double quotes or two single quotes)
          if (cellContents.includes("''") || cellContents.includes('"')) {
            //the following RegEx gets each size spec: digit followed by two single quotes or double quotes
            //each output is parsed into Int via map(), if larger than min specified in filters[key] then 1
            //if the sum of all comparisons is 0, don't show
            if (cellContents.match(/\d+(''|")/g).map(i => {return (parseInt(i, 10)) >= filters[key][">"] ? 1 : 0;}).reduce((a, b) => a + b) === 0) {
              showFlag = false;
              break;
            }
          }
          if (cellContents.includes("'")) {
            if (cellContents.match(/\d+['^']/g).map(i => {return (parseInt(i, 10) * 12) >= filters[key][">"] ? 1 : 0;}).reduce((a, b) => a + b) === 0) {
              showFlag = false;
              break;
            }
          }
        }
        if (filters[key]["<"]) {
          //check if min width or height is in inches (double quotes or two single quotes)
          if (cellContents.includes("''") || cellContents.includes('"')) {
            if (cellContents.match(/\d+(''|")/g).map(i => {return (parseInt(i, 10)) <= filters[key]["<"] ? 1 : 0;}).reduce((a, b) => a + b) === 0) {
              showFlag = false;
              break;
            }
          }
          if (cellContents.includes("'")) {
            if (cellContents.match(/\d+['^']/g).map(i => {return (parseInt(i, 10) * 12) <= filters[key]["<"] ? 1 : 0;}).reduce((a, b) => a + b) === 0) {
              showFlag = false;
              break;
            }
          }
        }
      }
      
//       //when a month drop down choice is a filter criteria
//       if (["Bloom\xa0Time", "Fruit\xa0Time", "When\xa0To\xa0Plant", "When\xa0To\xa0Prune", "When\xa0To\xa0Feed"].
//           includes(arrHeaders[Object.keys(filters)])) {
//         for (k in filters[key]) {
//           if (cellContents.toUpperCase().includes(filters[key][k])) {
//             showFlag = true;
//             break;
//           } else 
//           {
//             showFlag = false;
//           }
//         }
//       }

//       //when a drop down choice(s) is a filter criteria
//       else 
      if (Array.isArray(filters[key])) {
        if (!filters[key].includes(cellContents.toUpperCase())) {
          showFlag = false;
          break;
        }
      }

      //when an entry is typed in filter field
      if (typeof filters[key] === "string") {
        if (!cellContents.toUpperCase().includes(filters[key])) {
          showFlag = false;
          break;
        }
      }

    }
    if (showFlag) {
      tr[i].style.display = "";
    } else {
      tr[i].style.display = "none";
    }
  }
  goUp();
}


//////////////////////////////////////////////////////////////////////
// this function pulls unique values from the column it was called and creates 
// drop-down menu with those values or displays min/max range input fileds;
function getUnqVals(forCell) {

  //hide any drop down menus
  cleanView();
  
  let dropList = document.createElement("ul");
  dropList.className = "dropUnqVals";
  forCell.appendChild(dropList);
  
  //determine the name of the column by pulling its index from arrHeaders
  let colName = arrHeaders[forCell.cellIndex];
  
  //columns width and height display min and max range input fields instead of unique values
  if (colName === "Height" || colName === "Width") {
    for (let i = 0; i < 2; i++) {
      let liText = document.createElement("li");
      let liInput = document.createElement("input");
      //there are only two LIs, min and max
      if (i === 0) {
        liText.appendChild(document.createTextNode("Min " + colName + " (inch)"));
        liInput.setAttribute("class", "inputRangeMin");
        filters[forCell.cellIndex] ? liInput.value = filters[forCell.cellIndex][">"] : false;
      } else {
        liText.appendChild(document.createTextNode("Max " + colName + " (inch)"));
        liInput.setAttribute("class", "inputRangeMax");
        filters[forCell.cellIndex] ? liInput.value = filters[forCell.cellIndex]["<"] : false;
      }
      liInput.setAttribute("type", "text");
      liText.appendChild(liInput);
      dropList.append(liText);
    }
  }
//   //columns with time of the year display months instead of unique values
//   else if (["Bloom\xa0Time", "Fruit\xa0Time", "When\xa0To\xa0Plant", "When\xa0To\xa0Prune", "When\xa0To\xa0Feed"].includes(colName)) {
//     let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//     for (m in months) {
//       let liText = document.createElement("li");
//       liText.setAttribute("class", "customChoice");
//       liText.appendChild(document.createTextNode(months[m]));
//       dropList.appendChild(liText);
//     }
//   }
  
  //maybe todo, all affect filtering: 
  //class column should only display each one class, not the filtered variety
  //color column should only display each one color, not the filtered variety
  //leaves column should only display each one leaves choice, not the filtered variety
  //origin column should only display each one origin, not the filtered variety
  //soil column should only display each one soil type, not the filtered variety
  //time related columns should only display months or seasons 
  
  //all other, non-size, columns
  else {
    let tr = table.getElementsByTagName("tr");
    //the array rUnqVals holds unique values from the given column
    let rUnqVals = [];
    loopTableRows:
    for (let i = 2, l = tr.length - 2; i < l; i++) {
      //add value to the drop down if it hasn't been hidden (display isn't none) 
      //OR the clicked column is already used for filtering (its index is in filters)
      //OR if pulling common names to add a new plant
      if (tr[i].style.display != "none" 
          || filters[forCell.cellIndex] 
          || forCell.children[1].id.toString().substr(0,11) === "btnNewPlant") {
        //if not pulling common names to add a new plant, don't show values that
        //are filtered out based on columns other than the one clicked
        if (forCell.children[1].id.toString().substr(0,11) != "btnNewPlant") {
          //loop through filters and exclude rows that are not included in filters
          loopExistingFilters:
          for (key in filters) {
            //keep the clicked column
            if (Number(key) === forCell.cellIndex) {
              continue; //next filter
            }
            //exclude values that are filtered out for other columns
            if (!filters[key].toString().includes(tr[i].children[key].textContent.toUpperCase())
            && !tr[i].children[key].textContent.toUpperCase().includes(filters[key])) {
              continue loopTableRows;
            }
          }
        }
        let cellValue = tr[i].children[forCell.cellIndex].innerText;
        //only add the value if it's not already in the array and if it's not an empty value and if it's not filtered out using other than clicked on columns
        if (rUnqVals.indexOf(cellValue) === -1 && cellValue.length > 0) {
          rUnqVals.push(cellValue);
        }
      }
    }
    
    //sort the drop down values alphabetically
    rUnqVals.sort();
    
    //add the drop down values to the UL dropList
    for (let i = 0, l = rUnqVals.length; i < l; i++) {
      let liText = document.createElement("li");
      liText.setAttribute("class", "customChoice");
      //if not pulling common names to add a new plant, format already selected values 
      if (filters[forCell.cellIndex] 
          && forCell.children[1].id.toString().substr(0,11) != "btnNewPlant") {
        if (filters[forCell.cellIndex].includes(rUnqVals[i].toUpperCase())) {
          liText.style.color = "rgba(204, 255, 153, 0.90)";
          liText.style.backgroundColor = "navy";
        }
      }
      liText.appendChild(document.createTextNode(rUnqVals[i]));
      dropList.append(liText);
    }
  }
}

//////////////////////////////////////////////////////////////////////
//this function adds an inner button inside the filter field for clearing
//the text inside filter field & a scissors button for clearing all filters
function addClearingBtn(toCell) {
  if (!toCell.getElementsByClassName("btnRight")[0]) {
    let delBtn = document.createElement("button");
    delBtn.className = "btnInner btnRight";
    delBtn.title = "clear text";
    delBtn.innerHTML = "<img class='btnImg' src='pictures/btnCut.png'>";
    toCell.appendChild(delBtn);
  }
  $("#btnClearAllFilters").show();
}

//////////////////////////////////////////////////////////////////////
//this function removes the clearing button, first checking that it's there
function removeClearingBtn(fromCell) {
  let delBtn = fromCell.getElementsByClassName("btnRight")[0];
  //when removing the delete button, do the clean up: 
  if (delBtn) {
    //clear the cell value and placeholder
    fromCell.children[0].value = "";
    fromCell.removeChild(delBtn);
    //delete the removed value from filters object
    delete (filters[fromCell.cellIndex]);
    //update the filters object in session storage or remove it if empty
		if (Object.keys(filters).length===0) {
      sessionStorage.removeItem("filters");
      $("#btnClearAllFilters").hide();
    } else {
      sessionStorage.filters=JSON.stringify(filters);
    }
  }
}

//////////////////////////////////////////////////////////////////////
//hide new plants buttons
function hideNewPlantBtns(tgtParents) {
  tgtParents.querySelector("#btnNewPlantClear").style.display = "none";
  tgtParents.querySelector("#btnNewPlantAdd").style.display = "none";
  //TODO: uncomment when code is ready
//   tgtParents.querySelector("#btnNewPlantSubmit").style.display = "none";
}

//////////////////////////////////////////////////////////////////////
//this function creates a UI list for a supplied UI using supplied values
function addDropDown(UIname, arrValues) {
  let elt = document.getElementById(UIname);
  for (let i = 0, l = arrValues.length; i < l; i++) {
    let myli = document.createElement("li");
    myli.className = "customChoice";
    myli.textContent = arrValues[i].replaceAll("&nbsp", "\xa0");
    elt.appendChild(myli);
  }
}

//////////////////////////////////////////////////////////////////////
//this function is called to hide or display columns for different views
function displayColumns(tgt) {
  let showColName = [];
  let viewOrder = ["Full", "Plan", "Care", "Min"];
  //when the end of the viewOrder is reached, go back to the beginning, Full View
  //update the button text and the name of the view, stored in session storage
  if (viewOrder.indexOf(tgt.innerText) === viewOrder.length -1) {
    tgt.innerText = viewOrder[0];
  } 
  else {
    tgt.innerText = viewOrder[viewOrder.indexOf(tgt.innerText)+1];
  }
  
  //determine which columns to show, based on the view chosen
  switch (tgt.innerText) {
    case "Plan":
      showColName = ['Common\xa0Name','Notes','Action','Class','Height','Width','Color','Leaves','Bloom\xa0Time','Sun','Roots','In\xa0Garden','Natural\xa0Habitat','Origin','Wildlife','Companions','Ally','Enemy','Soil','When\xa0To\xa0Plant','Picture'];
      break;
    case "Care":
      showColName = ['Common\xa0Name','Notes','Action','Soil','How\xa0To\xa0Plant','When\xa0To\xa0Plant','Days\xa0To...','How\xa0To\xa0Prune','When\xa0To\xa0Prune','Food\xa0And\xa0Water','When\xa0To\xa0Feed','Propagating','Problems','Picture'];
      break;
    case "Min":
      showColName = ['Common\xa0Name','Notes','Picture'];
      break;
    case "Full":
    default:
      //unhide hidden columns
      showColName = sessionStorage.hiddenColumns.split(",");
      break;
    }
  
  //hide/show columns and update session storage, recording hidden
  //columns only, full view (default) is not recorded; not using
  //storeHiddenCol() here, as it's easier to overwrite stored entry
  for (let i = 0, len = arrHeaders.length; i < len; i++) {
    if (showColName.includes(arrHeaders[i]) || tgt.innerText === "Full") {
      customColumnDisplay(i, true);
    } else {
      customColumnDisplay(i, false);
    }
  }
  if (tgt.innerText === "Full") {
    sessionStorage.removeItem("viewName");
    sessionStorage.removeItem("hiddenColumns");
    $("#btnCustomCols").hide();
  } else {
    //update the view name in session storage
    sessionStorage.viewName = tgt.innerText;
    //capture hidden columns in session storage
    sessionStorage.hiddenColumns = arrHeaders.filter(x=>!showColName.includes(x));
    $("#btnCustomCols").show();
  }
}

//////////////////////////////////////////////////////////////////////
//this function toggles columns display
function customColumnDisplay(colNr, show) {
  let droppedElements = document.getElementById("dropColNames");
  if (show) {
    //show the clicked column; plus 1 for jQuery;
    $("td:nth-child(" + (colNr+1) + "),th:nth-child(" + (colNr+1) + ")").show();
    //style the clicked column's display in the drop down menu
    droppedElements.children[colNr].style.color = "navy";
    droppedElements.children[colNr].style.backgroundColor = "";
  } 
  else {
    //show the clicked column; plus 1 for jQuery;
    $("td:nth-child(" + (colNr+1) + "),th:nth-child(" + (colNr+1) + ")").hide();
    //style the clicked column's display in the drop down menu
    droppedElements.children[colNr].style.color = "rgba(50, 50, 50, 0.7)"; //dark grey
    droppedElements.children[colNr].style.backgroundColor = "rgba(50, 50, 50, 0.1)"; //light grey
  }
}

//////////////////////////////////////////////////////////////////////
//the function updates session storage with the hidden columns,
//to keep the customized view for the duration of the session
function storeHiddenCol(colLiText, hide) {
  document.getElementById("btnView").innerText = "Custom";
  sessionStorage.viewName = "Custom";
  if (hide) {
    //show the columns drop down menu, the eye
    $("#btnCustomCols").show();
    //check if hiddenColumns exists in sessionStorage
    if (sessionStorage.hiddenColumns) {
      //if column name isn't already in hiddenColumns session storage, add it
      if (sessionStorage.hiddenColumns.split(",").indexOf(colLiText) === -1) {
	      sessionStorage.hiddenColumns += "," + colLiText;
      }
    } 
    //otherwise, create hiddenColumns in sessionStorage using column name supplied
    else {
      sessionStorage.hiddenColumns = colLiText;
    }
  } 
  else {
    //check if hiddenColumns exists in sessionStorage
    if (sessionStorage.hiddenColumns) {
      //create an array from hiddenColumns values
	    let storedHiddenCols = sessionStorage.hiddenColumns.split(",");
      if (storedHiddenCols.includes(colLiText)) {
        //remove the unhidden column name
        storedHiddenCols.splice(storedHiddenCols.indexOf(colLiText), 1);
      }
      if (storedHiddenCols.length===0) {
        sessionStorage.removeItem("hiddenColumns");
        sessionStorage.removeItem("viewName");
        document.getElementById("btnView").innerText = "Full";
        $("#btnCustomCols").hide();
      } 
      else {
        $("#btnCustomCols").show();
        sessionStorage.hiddenColumns = storedHiddenCols;   
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////
//hide/remove all showing menus
function cleanView() {
  let dropMenus = document.getElementsByClassName("dropUnqVals");
  for (let i = 0, l = dropMenus.length; i < l; i++) {
    dropMenus[0].parentElement.removeChild(dropMenus[0]);
  }
  document.getElementById("dropColNames").style.display = "";
  let expImpButton = document.getElementsByClassName("expImp");
  if (expImpButton[1]) {
    expImpButton[1].parentElement.parentElement.removeChild(expImpButton[1].parentElement);
  }
  //hide the picture gallery
  document.getElementById("picGal").style.display="none";
  //hide the export/import menu view
  document.getElementById("dropExportImport").style.display = "none";
}


//////////////////////////////////////////////////////////////////////
//this function is triggered by a click or key entry anywhere on the page;
//it handles all events/functionality except: 
// - update and delete inner buttons of user added plant buttons x3
function allClicks(e) {

  let tgt = e.target;
  tgt.className==="btnImg"?tgt=tgt.parentElement:tgt;
    
  let impTextFormatCheck = function(txt) {
    //validate the format of the data to import "Latin Name":"notes, action or location text"
    if (txt.search(/(\".+\":\".+\")/g) > -1) {
      return true;
    }
    else {
      return false;
    }
  }

  //-- key entries -------------------------------------------------
  if (e.type === "keyup") {
    //exit the function if the key clicked is a tab (9) or changing window tabs (91)
    //and this is not a ctrl(cmd)+delete(backspace) click(91) in the editable fields
    if ((e.keyCode === 91 && !["filterInput","inputRangeMin","inputRangeMax"].includes(tgt.className)
        && !tgt.contentEditable) 
       || e.keyCode === 9) {
      return;
    }
    //if return (13) or escape (27) keys are clicked
    if ((e.keyCode === 13 && tgt.tagName != "TEXTAREA") || e.keyCode === 27) {
      cleanView();
    }
    //if alphanumeric text is typed/edited in the filter row
    else if (tgt.classList.contains("filterInput") && tgt.value.match(/^.+$/)) {
      filterByText(e);
    }
    
    //if alphanumeric text is typed/edited in the min/max ranges of width/height columns
    else if (tgt.classList.toString().includes("inputRange") && tgt.value.match(/^.+$/)) {
      filterBySizeRange(e);
    }  
    
    //if text is deleted from filtering fields, including size ranges
    else if (["filterInput","inputRangeMin","inputRangeMax"].includes(tgt.className)
      //.. or delete/erase key or ctrl(cmnd)+delete keys are pressed until all the text is erased
//       || [8,91].includes(e.keyCode) && tgt.value.length === 0
             && tgt.value.length === 0) {
      clearFilter(tgt);
    }
    
    //if text is typed within new plant row
    else if (tgt.id === "newPlantRow"
            || (tgt.contentEditable === "true" && tgt.parentElement.parentElement.id === "newPlantRow")) {
      tgt.parentElement.parentElement.querySelector("#btnNewPlantAdd").style.display = "block";
      tgt.parentElement.parentElement.querySelector("#btnNewPlantClear").style.display = "block";
      //disabled until code is ready
//       tgt.parentElement.parentElement.querySelector("#btnNewPlantSubmit").style.display = "block";
    }
    
    //if changes are made to Notes, Action, or In Garden columns
    else if (["Notes", "Action", "In\xa0Garden"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt);
    }
    
    //keyup in import window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      //if the data is in the correct format, display done button
      if (impTextFormatCheck(tgt.value)) {
        tgt.parentElement.children[2].title = "Click to upload your data and close this window. Once "
          +"uploaded, refresh the page to see the added data." ;
        tgt.parentElement.children[2].style.display = "";
      }
      else {
        tgt.parentElement.children[2].style.display = "none";
      }
    }
    
    //all other cases - roll up all the drop down menus
    else {
      cleanView();
    }
  }
  
  //-- data is pasted -------------------------------------------------
  else if (e.type === "paste") {
    //blank text is pasted
    if ((e.clipboardData || window.clipboardData).getData("text") === "") {
      return;
    }
    //alphanumeric text is pasted into filter row
    else if (tgt.className === "filterInput"
             && (e.clipboardData || window.clipboardData).getData("text").match(/^.+$/)) {
      filterByText(e);
    }
    //alphanumeric text is pasted into filtering min/max size ranges
    else if (["inputRangeMin", "inputRangeMax"].includes(tgt.className)
             && (e.clipboardData || window.clipboardData).getData("text").match(/^.+$/)) {
      filterBySizeRange(e);
    }
    //if data is pasted into editable Notes, Action, or In Garden columns (not filter)
    else if (["Notes", "Action", "In\xa0Garden"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt);
    }
    //if data is pasted into import window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      //if the data is in the correct format, display done button
      if (impTextFormatCheck((e.clipboardData || window.clipboardData).getData("text"))) {
        tgt.parentElement.children[2].title = "Click to upload your data and close this window. Once "
          +"uploaded, refresh the page to see the added data." ;
        tgt.parentElement.children[2].style.display = "";
      }
      else {
        tgt.parentElement.children[2].style.display = "none";
      }
    }
    else return;
  }
  
  //-- data is cut -------------------------------------------------
  else if (e.type === "cut") {
    //alphanumeric text is cut/edited in a filter field
    if (tgt.className === "filterInput" && tgt.value.match(/^.+$/)) {
      filterByText(e);
    }
    //alphanumeric text is cut/edited in a filter field min/max size ranges
    else if (["inputRangeMin", "inputRangeMax"].includes(tgt.className) && tgt.value.match(/^.+$/)) {
      filterBySizeRange(e);
    }
    //all text is cut from a filter field, including size ranges
    else if ((tgt.className === "filterInput"
         || ["inputRangeMin", "inputRangeMax"].includes(tgt.className)) 
      && tgt.value.length === 0) {
      clearFilter(tgt);
    }
    //handle data cut from exp/imp window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      tgt.parentElement.children[2].style.display = "none";
    }
    //if changes are made to Notes, Action, or In Garden columns
    else if (["Notes", "Action", "In\xa0Garden"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt);
    }
    else return;
  }
  
  //-- mouse clicks or finger taps -------------------------------------------------
  else if (e.type === "click") {
    
    // clicks on up / down speedy buttons
    if (tgt.id === "btnDn" ) {
      cleanView();
      goDn();
    } 
    else if (tgt.id === "btnUp") {
      cleanView();
      goUp();
    }
    
    //view settings
    //btnView is clicked: scroll through views if it's a single click, show menu for a double click
    else if (tgt.className === "fa fa-fw fa-cog" && tgt.parentElement.id === "btnView"
       || tgt.id === "btnView") {
      cleanView();  
      displayColumns(tgt);
    }
        
    //a click on a table header's eye icon
    else if (tgt.className === "fas fa-eye" && tgt.parentElement.tagName === "TH") {
      customColumnDisplay(arrHeaders.indexOf(tgt.parentElement.innerText), false);
      storeHiddenCol(tgt.parentElement.innerText, true);
    }
    
    //a click on an eye icon in the nav bar
    else if (tgt.className === "fas fa-eye" && tgt.parentElement.className === "navbar") {
      $("#dropColNames").toggle();
    }
    
    //a click on one of the custom drop down choices (column choices)
    else if (tgt.className === "customChoice" && tgt.parentNode.id === "dropColNames") {
      if (table.getElementsByTagName("TH")[arrHeaders.indexOf(tgt.innerText)].style.display === "none") {
        customColumnDisplay(arrHeaders.indexOf(tgt.innerText), true);
        storeHiddenCol(tgt.innerText, false);
      }
      else {
        customColumnDisplay(arrHeaders.indexOf(tgt.innerText), false);
        storeHiddenCol(tgt.innerText, true);
      }
    }
    
    //an import/export button of navbar is clicked
    else if (tgt.id === "btnExportImport") {
      $("#dropExportImport").toggle();
      let expImpButton = document.getElementsByClassName("expImp");
      if (expImpButton[1]) {
        expImpButton[1].parentElement.parentElement.removeChild(expImpButton[1].parentElement);
      }
    }
    
    //when one of the Export/Import drop down choices is clicked
    else if (tgt.className === "customChoice" && tgt.parentNode.id === "dropExportImport") {
      //hide the Export/Import submenu
      $("#dropExportImport").hide();
      impExp(tgt);
    }

    //taps in the export/import text area
    else if ((tgt.classList.contains("exp")||tgt.classList.contains("imp")) 
             && tgt.tagName === "TEXTAREA") {
      return;
    }
    
    //tap on the export/import close/cancel button
    else if (tgt.classList.contains("expImp") && tgt.classList.contains("btnRight")) {
      document.body.removeChild(tgt.parentElement);
    }

    //tap on the export done/go button: copy the data and close the window
    else if (tgt.classList.contains("exp") && tgt.classList.contains("btnLeft")) {
      tgt.parentElement.children[0].select();
      tgt.parentElement.children[0].setSelectionRange(0, 99999); //mobile
      document.execCommand("copy");
      document.body.removeChild(tgt.parentElement);
    }
    
    //tap on the import done/go button: format & load data into local storage
    else if (tgt.classList.contains("imp") && tgt.classList.contains("btnLeft")) {

      //could check if the latin name of imported name already exists, disabled for now
//       let latinNames = Array.from(document.getElementsByTagName("TD")).filter(x => x.cellIndex === 1).map(x=>x.innerText).filter(x=>x.length>1);
      // the FOR loop below is faster than the FILTER function above
//       for (i = 0; i < orAr.length; i++) {
//         if (orAr[i].cellIndex===1){console.log(orAr[i].innerText);}
//       }
      
      // ensure the correct JSON-parseable format of imported data "Latin Name":"notes, action or location text"
      // by splitting the text's key value pairs, replacing double quotes with two singles ane recomposing

      // ..1. starting at the first double quote, thus skipping optional title, 
      //      split the text using delimeter: double quote follower by comma follower by optional space
      //      thus checking that all entries end with a double quote
      let txtEntries = tgt.parentElement.children[0].value.slice(
        tgt.parentElement.children[0].value.search('"')+1, 
        tgt.parentElement.children[0].value.length-1).split(/\",\s?\"/);
    
      // ..2. start the entry with a curly brace 
      let formattedEntry = "{\"";    

      // ..3. scroll through entries
      for (let i = 0, len = txtEntries.length; i < len; i++) {


        // ..4. check that each entry has a ":" key value separator
        if (txtEntries[i].includes("\":\"")) {
          // ..6. on the last itiration, replace the double quotes with two single quotes add a double quote and closing curly brace to the entry
          if(i === len-1 && tgt.parentElement.children[0].value.substr(-1,1) === "\"") {
            formattedEntry += txtEntries[i].split('":"')[0].replaceAll('"',"''")+'":"'
              +txtEntries[i].split('":"')[1].replaceAll('"',"''")+"\"}";
          } else {
            // ..5. split the entry, replace the double quotes with two single quotes and reconnect the entry
            formattedEntry += txtEntries[i].split('":"')[0].replaceAll('"',"''")
              +'":"'+txtEntries[i].split('":"')[1].replaceAll('"',"''") + '", "';
          }
        }
      }
    
      localStorage.setItem("aas_myGardenDb_" + tgt.value.replace(/ /g, ""),formattedEntry);
      document.body.removeChild(tgt.parentElement);
    }

    //click on column header, sort the table using the clicked column as key
    else if (tgt.tagName === "TH") {
      sortTable(e.target.cellIndex);
    }
    
    //click on filtering drop down leaf
    else if (["frozenFilterRow", "filterFreeze"].includes(tgt.parentElement.className)
               && tgt.classList.value === "btnInner btnLeft") {
      //if the unique to column values are already populated (there is at least one), remove 
      //them; otherwise, add them by calling getUnqVals() funciton in the else clause below
      if (tgt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
        tgt.parentElement.removeChild(tgt.parentElement.getElementsByClassName("dropUnqVals")[0]);
        return;
      } else {
        getUnqVals(tgt.parentElement);
      }
    }
    
    //click on one of the leaf's filtering drop down choices
    else if (tgt.parentElement.parentElement
             && ["frozenFilterRow", "filterFreeze"].includes(tgt.parentElement.parentElement.className)
             && tgt.className === "customChoice") {

      //forCell is a table data cell <td> of the Frozen Filter Row
      let forCell = tgt.parentElement.parentElement;

      //if there isn't an array entry for this column number in filters, create a blank one;
      //this is done so that the entry can then be searched for a clicked value
      if (!Array.isArray(filters[forCell.cellIndex])) {
        filters[forCell.cellIndex] = [];
      }

      //if the clicked choice is already in filters variable as column number:array of choices, remove
      //it, change the formatting of the drop down choice back to the original & update sessionStorage
      if (filters[forCell.cellIndex].includes(event.target.innerText.toUpperCase())) {
        let i = filters[forCell.cellIndex].indexOf(event.target.innerText.toUpperCase());
        filters[forCell.cellIndex].splice(i, 1);
        tgt.style.color = "navy";
        tgt.style.backgroundColor = "rgba(204, 255, 153, 0.90)";
        sessionStorage.filters = JSON.stringify(filters);
        //if the removed element was the last one in array, remove the emptying button and
        //delete that whole entry for the object, update sessionStorage
        if (filters[forCell.cellIndex].length === 0) {
          removeClearingBtn(forCell);
        } 
        //if there is only one selection remaining, updae the filter field to show it instead of ***
        else if (filters[forCell.cellIndex].length === 1) {
          forCell.children[0].value = filters[forCell.cellIndex][0].toLowerCase();
        }
      }
      //else, if the selected choice is not in the filters[], add it, do the formatting
      else {
        filters[forCell.cellIndex].push(event.target.innerText.toUpperCase());
        tgt.style.color = "rgba(204, 255, 153, 0.90)";
        tgt.style.backgroundColor = "navy";

        //if one value is selected, display it in the filter field
        if (filters[forCell.cellIndex].length === 1) {
          forCell.children[0].value = event.target.innerText;
          addClearingBtn(forCell);
          sessionStorage.filters=JSON.stringify(filters);
        }
        //if more than one value is selected, add a comma and ellipsis
        else if (filters[forCell.cellIndex].length === 2) {
          forCell.children[0].value = "...";
          sessionStorage.filters=JSON.stringify(filters);
        }
        //if values are deleted, diplayed that (emptyness)
        else if (filters[forCell.cellIndex].length === 0) {
          forCell.children[0].value = event.target.innerText;
          removeClearingBtn(forCell);
        }
      }
      filterData();
      
    }
    
    //click on filter-clearing scissors
    else if (["frozenFilterRow", "filterFreeze"].includes(tgt.parentElement.className)
               && tgt.classList.value === "btnInner btnRight") {
      clearFilter(tgt);
    }
    
    //click on clear all filters button, upper scissors
    else if (tgt.id === "btnClearAllFilters") {
      //hide the scissors button
      tgt.display = "none";
      //scroll through the keys of the filters variable and clear each
      //going for table's first child(body) then second (filters row) then column(key)
      for (key in filters) {
        clearFilter(table.children[0].children[1].children[key].getElementsByClassName("btnRight")[0]);
      }
      filters = {};
    }

    //buttons for user to add a plant
    //click on 'clear text' button
    else if (tgt.id === "btnNewPlantClear") {
      hideNewPlantBtns(tgt.parentElement.parentElement);
      clearNewPlant();
    }
    //click on upload button
    else if (tgt.id === "btnNewPlantAdd") {
      hideNewPlantBtns(tgt.parentElement.parentElement);
      storeNewPlant();
    }
    //click on 'copy to modify' button
    else if (tgt.id === "btnNewPlantCopy") {
      if (tgt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
        tgt.parentElement.removeChild(tgt.parentElement.getElementsByClassName("dropUnqVals")[0]);
      } else {
        getUnqVals(tgt.parentElement);
      }
    }
    //if one of the choices from existing plant menu (triggered above) is clicked
    else if (tgt.className === "customChoice"
            && tgt.parentElement.parentElement.parentElement.id === "newPlantRow") {
      tgt.parentElement.parentElement.querySelector("#btnNewPlantClear").style.display = "block";
      copyRow(tgt);
    }

    //click on save changes button in Notes, Action, or In Garden columns
    else if (tgt.classList.contains("btnUpdatePlant")) {
      updateExistingPlant(tgt);
    }

    //if a picture is clicked, call the function to display the image gallery
    else if (tgt.className === "pic") {
      openGallery(tgt);
    }
    
    //if a next picture (right button) of picture gallery is clicked
    else if (tgt.className === "btnRight" && tgt.parentElement.id === "picGal") {
      try {
        let str = tgt.parentElement.children[0].src;
        //increase the picture file name number by one 
        tgt.parentElement.children[0].src = str.replace(str.match(/\d+/),Number(str.match(/\d+/))+1);
        //show the previous picture (left) button
        tgt.parentElement.children[1].style.display = "block";
        //if it's the max file name number, hide the next picutre button
        if (Number(tgt.parentElement.children[0].src.match(/\d+/))
            === Number(tgt.parentElement.children[0].attributes.value.value)){
          tgt.style.display = "none";
        }
      }
      catch (error) {
        console.log("Error:"+error+". Unable to load next picture or other issues in response to the image gallery right button click.")
      }
    }
    
    //if a previous picture (left button) of picture gallery is clicked
    else if (tgt.className === "btnLeft" && tgt.parentElement.id === "picGal") {
      try {
        let str = tgt.parentElement.children[0].src;
        //increase the picture file name number by one 
        tgt.parentElement.children[0].src = str.replace(str.match(/\d+/),Number(str.match(/\d+/))-1);
        //show the next picture (right) button
        tgt.parentElement.children[2].style.display = "block";
        //if the file name number is 1, it's the first photo, thus hide the previous picutre button
        if (Number(tgt.parentElement.children[0].src.match(/\d+/)) === 1){
          tgt.style.display = "none";
        }
      }
      catch (error) {
        console.log("Error:"+error+". Unable to load previous picture or other issues in response to the image gallery left button click.")
      }
    }
    //all other clicks
    else {
      //if a click is not on one of export/import or new plant's update/cancel buttons
      if (!(["expImp", "btnInner"].map(i => {return tgt.classList.contains(i)}).reduce((a,b)=> a+b) 
            && ["btnRight","btnLeft"].map(i => {return tgt.classList.contains(i)}).reduce((a,b)=> a+b)
            || tgt.classList.toString().includes("inputRange")
            || (tgt.children[0] && tgt.children[0].classList.toString().includes("inputRange")))) {
        cleanView();
      }
    }
  }
  else if (["mousedown", "touchstart"].includes(e.type)) {
//     e.preventDefault();
//     e.stopPropagation();
    curCol = tgt.parentElement;
    pageX = e.pageX;

    let padding = paddingDiff(curCol);
    curColWidth = curCol.offsetWidth - padding;

    function paddingDiff(col){
      if (getStyleVal(col,'box-sizing') == 'border-box'){
        return 0;
      }
      return (parseInt(getStyleVal(col,'padding-left')) + parseInt(getStyleVal(col,'padding-right')));
    }

    function getStyleVal(elm,css){
       return (window.getComputedStyle(elm, null).getPropertyValue(css));
     }
  }
  else if (["mousemove", "touchmove"].includes(e.type)) {
    if (!curCol) return;
    e.preventDefault();
//     e.stopPropagation();
    if (curCol) {
      let diffX = e.pageX - pageX;
      if ((curColWidth + diffX) < 75) {
        diffX = 75 - curColWidth;
      }
      curCol.style.width = (curColWidth + diffX)+'px';
    } 
  }
}

//////////////////////////////////////////////////////////////////////
//clear resizing variables on touch/mouse up
function touchUp() {
  curCol = undefined;
  pageX = undefined;
  curColWidth = undefined;
}


//////////////////////////////////////////////////////////////////////
//display the photo gallery
function openGallery(tgt) {
  cleanView();
  let picGallery = document.getElementById("picGal");
  picGallery.style.display = "block";
  picGallery.children[0].src = tgt.src;
  //capture the number of photos available in picture gallery picture from the source picture
  picGallery.children[0].attributes.value.value = tgt.attributes.value.value;
  picGallery.style.right = tgt.parentElement.getBoundingClientRect().width + "px";
  picGallery.style.top = tgt.parentElement.parentElement.parentElement.children[1].getBoundingClientRect().height*3+"px";
  picGallery.children[3].innerText = tgt.alt;
  picGallery.children[1].style.display = "none";
  if (Number(tgt.attributes.value.value) > 1) {
    picGallery.children[2].style.display = "block";
  } 
  else {
    picGallery.children[2].style.display = "none";
  }
}

//////////////////////////////////////////////////////////////////////
// When the user clicks on the button, scroll to the bottom of the document
function goDn() {
  document.body.scrollTop = document.body.scrollHeight-500;
  document.documentElement.scrollTop = document.documentElement.scrollHeight-500;
}

//////////////////////////////////////////////////////////////////////
// When the user clicks on the button, scroll to the top of the document
function goUp() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}

//////////////////////////////////////////////////////////////////////
//this function is never called; it's here to manually check storage size for now
function checkUsedStorage() {
  let _lsTotal = 0,
    _xLen,
    _x;
  for (_x in localStorage) {
    if (!localStorage.hasOwnProperty(_x)) {
      continue;
    }
    _xLen = ((localStorage[_x].length + _x.length) * 2);
    _lsTotal += _xLen;
    console.log(_x.substr(0, 50) + " = " + (_xLen / 1024).toFixed(2) + " KB")
  }
  ;
  return ( "Total = " + (_lsTotal / 1024).toFixed(2) + " KB") ;
}
