/* #################
   ### IMPORTANT ###
   #################
 - in this script, a plain ID number is reserved for IDs for plants (rows) added by a user;
 - for efficiency, editable contents columns support is designed around the order of those columns,
 - those are columns Notes (3rd column, index 2, in JSON 1), Status (4th, 3, 2), Garden Location (14th, 13, 12)
 - should the column order change, update the code in allClicks(), used to be addBtnUsrChgs(),
 - & appendPlantToTable() as well as visual.js code accordingly
*/

  const table = document.getElementById("plants");
  var tdRowCnt = null;
  var addedRowCounter = []; // used for accessing added plants, a unique number for each
  var unqLatinNames = []; // array of unique latin names, from plants.json and added, used to enforce uniqueness
  var filters = {}; // filters{} is a global var to support filtering multiple columns;
  var newRow = null;
  var arrHeaders = [];
  const splitableCols = ["Bloom\xa0Time", "Fruit\xa0Time", "When\xa0To\xa0Plant", "When\xa0To\xa0Prune", "When\xa0To\xa0Feed", "Class", "Color", "Leaves", "Sun", "Garden\xa0Location", "Soil", "Companions", "Enemy", "Natural\xa0Habitat", "Origin", "Height", "Width"]; // an array of columns, for which values are split into individual filter choices

  window.onload = main();

//////////////////////////////////////////////////////////////////////
// this function is called from html file on window load to pull data from plant.json file
function main() {
  fetch('plants.json')
    .then((resp) => {
      return resp.json()
    })
    .then((json) => {
      // create the main and only table - #plants
      createTblWithData(json);
//       modifyJsonOutput(json);
    })
    .then(() => {
      // menus for import/export and views
      menuSetup();
    })
    .then(() => {
      // set the newRow - the last row at the bottom of the table designated for entering new plants by user (not displayed on mobile)
      newRow = document.getElementById("newPlantRow");
      // set the table row count (td) excluding notes, references and new plant row at the bottom
      tdRowCnt = table.querySelectorAll("tr:not(.notesRefs):not(#newPlantRow)").length;
      // check for user-created plants stored in local storage and append them to the table
      if (typeof (Storage) !== "undefined") {
        checkStoredData();
        checkFilteredRowsCols();
      }
    })
    .catch((err) => {
      console.log(`Error in one of sub-mains: ${err}`);
      throw err;
    })
  ;
}

function modifyJsonOutput(json){
  let str = '';
  for (k of Object.keys(json)) {
    let len = json[k].length;
    str += "  \"" + k + "\": [ \n"
    for (let p = 0; p < len; p++) {
      if (p === 16){
        str += '    "' + json[k][p] + ", " + json[k][p+1] + "\", \n"
      } else if (p === 17) {
        continue
      } else if (p === len -1) {
        str += '    "' + json[k][p] + "\"\n  ],\n"
      } else {
        str += '    "' + json[k][p] + "\", \n"
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////
// add data pulled from plants.json to the table;
// call other functions to check local storage for user added plants;
// check session storage for filtered plants and hidden columns;
function createTblWithData(myObj) {
  var objNotes = null;
  let objStatus = null,
      objLocation = null;

  // determine if the user's device is a desktop or mobile, record it in colSpan to be used next
  const colSpan = window.matchMedia("only screen and (max-width: 600px)").matches?3:12;

  // start the text string to contain the body of the html table
  let txt = "<tbody>";
  // l = number of columns minus 1 (latin name, which is a key)
  const l = myObj[Object.keys(myObj)[0]].length;
  // k = Latin Name, the name of the key column in headers (first) JSON object entry
  let k = Object.keys(myObj)[0];

  // ***** build the HEADERS row
  // latin name is the key, name - 1st value index 0, notes - 2nd index 1, etc.
  txt += "<tr title='Click to Sort'>";

  let myNewStr = '';
  for (let i = 0; i < l; i++) {

    // *************
    // record column names in a var, replacing html nonbreaking space with a js one
    arrHeaders.push(myObj[k][i].replaceAll("&nbsp","\xa0"));

    // latin name is added separately cause it's the key and only needs to be added once per object entry, thus it's here, combined with the common name
    if (i === 0) {
      // replace nbsp for latin name value
      arrHeaders.push(k.replaceAll("&nbsp","\xa0"));
      // Name column header
      txt += `<th class='frozenCol colWidth2'>${myObj[k][i]}</th>`;
      // Latin Name column header
      txt += `<th class='colWidth2'>${k}`;
    }

    // Notes column header - add unique title, column width is wide
    else if (i === 1){
      txt += `<th class='colWidth3' title='Double click to edit'>${myObj[k][i]}`;
    }
    // Status column header - add unique title, column width is narrow
    else if (i === 2){
      txt += `<th class='colWidth1' title='This column is editable.'>${myObj[k][i]}`;
    }
    // Leaves column header - add unique title, column width is narrow
    else if (i === 7){
      txt += `<th class='colWidth1' title='Semi-evergreen keeps its leaves through winter in warmer climates. Annuals reseed every year, while perennials are like decidious and loose their leaves in winter, then come back in spring.'>${myObj[k][i]}`;
    }
    // Sun column header - add unique title, column width is narrow
    else if (i === 10){
      txt += `<th class='colWidth1' title='Full: 6 or more hours of sun a day, part-sun: 3-6 hours a day, shade: less than 3 hours of sun.'>${myObj[k][i]}`;
    }
    // 'Garden Location' column header - add unique title, column width is medium
    else if (i === 12){
      txt += `<th class='colWidth3' title='This column is editable.'>${myObj[k][i]}`;
    }
    // Soil column header - add unique title, column width is narrow
    else if (i === 18){
      txt += `<th class='colWidth2' title='Soil pH: circumneutral - near neutral, ph 6.8-7.2, acidic - below 6.8, alkaline - above 7.2. Moisture: hydric - abundant, mesic - moderate, xeric - dry.'>${myObj[k][i]}`;
    }
    // 'How To Plant' column header - add unique title, column width is medium
    else if (i === 19){
      txt += `<th class='colWidth3' title='In general, plant: rhizomatous, tap, fibrous root at 1" below soil surface; bulbs, ferns, grasses - shallow; trees, shrubs & vines keep at the same level. CM(#) means Cold Moist Stratify (days).'>${myObj[k][i]}`;
    }
    // 'When To Plant' column header - add unique title, column width is medium
    else if (i === 20){
      txt += `<th class='colWidth3' title="In NC, first frost is in early Nov, last frost is in early Mar. In general, it's best to plant trees in fall so that the energy is directed into root development, while the top is dormant.">${myObj[k][i]}`;
    }
    // 'Days To' column header - add unique title, column width is medium
    else if (i === 21){
      txt += `<th class='colWidth2' title='Days To - f: flower, g: germination, h: harvest, m: maturity.'>${myObj[k][i]}`;
    }
    // 'Food And Water' column header - add unique title, column width is medium
    else if (i === 24){
      txt += `<th class='colWidth2' title='During the 1st year, while the trees are getting established, they should be watered deeply (3'-5' weekly), to ensure good deep roots.'>${myObj[k][i]}`;
    }
    // narrow column headers, colWidth1
    else if ([3, 4, 5, 6, 7, 11].includes(i)){
      txt += `<th class='colWidth1'>${myObj[k][i]}`;
    }
    // medium size column headers, colWidth2
    else if ([8, 9, 14, 15, 17, 26, 27].includes(i)){
      txt += `<th class='colWidth2'>${myObj[k][i]}`;
    }
    // wide column headers, colWidth3
    else if ([13, 16, 22, 23, 24, 25].includes(i)){
      txt += `<th class='colWidth3'>${myObj[k][i]}`;
    }
    // photo
    else if (i===28) {
      txt += `<th class='colWidth2 pic'>${myObj[k][i]}`;
    }
    // headers for all other columns, which there shouldn't be any at this point
    else {
      txt += `<th>${myObj[k][i]}`;
    }
    // add an eye icon to each column except name
    txt += "<i title='Hide this column' class='btnHelper btnClose btnRight fas fa-eye'></i></th>"
  }
  txt += "</tr>";

  // ***** build the FILTERS row
  txt += "<tr>";
  for (let i = 0; i <= l; i++) {
    // name column
    if (i === 0) {
      // "filterCell" is a filter cell for the name column only
      txt += `<td class='filterCell'>` +
        `<input autocorrect='off' type='text' class='filterInput' placeholder='filter by ...' tabindex='${i+1}'>` +
        `<i class='btnHelper btnInner btnLeft fa fa-fw fa-filter' title='Filter by ${myObj[k][0].replace("&nbsp"," ")}'></i></td>`;
    }
    // add filterRow class to the last column (Picture) to disable its filtering
    else if (i === l) {
        txt += `<td class="filterRow"></td>`;
    }
    // all other columns, including latin
    else {
      txt += `<td class='filterRow'><input type='text' class='filterInput' tabindex=${i+1}> `;
      // latin name is key, thus the col title has to be pulled from iterator k
      if (i === 1) {
        txt +=  `<i class='btnHelper btnInner btnLeft fa fa-fw fa-filter' title='Filter by ${k.replace("&nbsp"," ")}'></i></td>`;
      }

      // filtering button is added to the filter cell of the name and latin columns and filtering cells of columns, listed in splitable columns array
      else if (splitableCols.includes(myObj[k][i-1].replaceAll("&nbsp","\xa0"))) {
        txt += `<i class='btnHelper btnInner btnLeft fa fa-fw fa-filter' title='Filter by ${myObj[k][i-1].replace("&nbsp"," ")}'></i></td>`;
      }
    }
  }
  txt += "</tr>";
  // remove the headers from myObj, since the headers are now recorded
  // and it's not needed for looping through data rows
  delete myObj[k];

  // ***** build the REST OF THE TABLE
  // loop through every row object of data returned from JSON as myObj, where Latin Name(x) is the key, Name is ind 0, Notes is 1, etc.
  for (let x in myObj) {

    // add data row <tr> and place a <td> with NAME in it;
    txt += "<tr><td class='frozenCol'>" + myObj[x][0] + "</td>";

    // if the local storage is available, pull Notes, Garden Location, if those exist
    if (typeof (Storage) !== "undefined") {
      try {
        objNotes = JSON.parse(localStorage.gDb_Notes);
      }
      catch (error) {
        // no Notes, Status, or Location recorded in local storage, no problem
      }
       try {
        objStatus = JSON.parse(localStorage.gDb_Status);
      }
      catch (error) {
        // no Status in local storage, no problem
      }
      try {
        objLocation = JSON.parse(localStorage.gDb_GardenLocation);
      }
      catch (error) {
        // no Garden Location in local storage, no problem
      }
    }

    // loop through the array of objects in JSON object - these become table rows
    for (let i = 0; i < l; i++) {
      switch (i) {
        // Latin Name
        case 0:
          txt += "<td>" + x + "</td>";
          // record latin name in the unqLatinNames array
          unqLatinNames.push(x.replaceAll("&nbsp","\xa0"));
          break;
        case 1:
          txt += `<td class='editableCol notes'>`;
          // objNotes - all Notes in local storage
          if (objNotes) {
            // if there is a notes entry in local storage, compare it to JSON entry..
            if (objNotes[x]) {
              // if identical, use the entry from JSON file and clear the entry from local storage
              if(objNotes[x].trim() === myObj[x][i].trim()) {
                txt += myObj[x][i];
                // clear Notes entry from objNotes variable
                delete objNotes[x];
                // update Notes in local storage, delete if objNotes is empty
                if (Object.entries(objNotes).length) {
                  localStorage.gDb_Notes = objNotes;
                }
                else {
                  localStorage.removeItem("gDb_Notes");
                }
              }
              else {
                // else go with user entry only
                txt += objNotes[x];
              }
            }
            // otherwise, use what's in plants.json
            else {
              txt += myObj[x][i];
            }
          } else {
            txt += myObj[x][i];
          }
          break;
        // Status, only load user's saved
        case 2:
          txt += "<td class='editableCol status'>";
          // objStatus - all Status in local storage
          if (objStatus) {
            if (objStatus[x]) {
              txt += objStatus[x];
            } else {
              txt += myObj[x][i];
            }
          }
          break;
        // Garden Location, only load user's saved
        case 12:
          txt += "<td class='editableCol location'>";
          // objLocation - all Garden Location in local storage
          if (objLocation) {
            if (objLocation[x]) {
              txt += objLocation[x];
            } else {
              txt += myObj[x][i];
            }
          }
          txt += "</td>";
          break;
        // Photo: if value in source file is not 0 then a photo is present: perform a lazy load, record the value indicating how many photos are available for the plant, set the source based on the name with .jpg extension, set the alternative text using the name
        case (l-1):
          if (myObj[x][i] === "0") {
            txt += `<td><img style="width:3em; height: 3em;" src='pictures/btnCog.png' alt='${myObj[x][0]}' /></td>`;
          } else {
            txt += "<td loading='lazy'>"
              + "<img class='pic' "
              + "value = '" + myObj[x][i] + "' "
            // remove spaces, dashes, quotes, v., (), & from the plants' names
              + "src='pictures/" + myObj[x][0].replace((/( |-|\(|\)|v\.|&|\"|\')/g),"") + "1.jpg' "
              + "alt='" + myObj[x][0] + "'"
            // saving good code for handling errors in images
//                   + "onerror='this.onerror=null; this.src=\"pictures/btnCog.png\"' "
              +"/></td>";
          }
          break;
        // All other columns
        default:
          txt += "<td>" + myObj[x][i] + "</td>";
          break;
      }
    }
    txt += "</tr>";
  }

  // on larger screens (non-phone, need to decide about iPads)
  if (colSpan === 12) {
    // if local storage is enabled, add NEW PLANT ROW, used for entering new plants; this new row is preloaded at the end of the table to allow addition of new data to be stored on a user's machine; also add storage features and retrieve session variables: filered rows and hidden columns
    if (typeof (Storage) !== "undefined") {
      txt += "<tr id='newPlantRow' contenteditable=true>"
      // blank cell for name is special, containing a div/text plus editing buttons
      // tab index is set to 31 = number of columns (count of values per key + key - picture)
      txt += `<td class='frozenCol' contenteditable=false><div contenteditable=true tabindex='${l+1}'></div>`

      txt += "<i id='btnNewPlantCopy' class='btnHelper btnInner btnLeft fa fa-fw fa-filter' title='Show plant names'></i>"

      txt += "<i id='btnNewPlantClear' class='btnHelper btnInner btnRight fa fa-fw fa-cut' title='Clear this row'></i>"

      txt += "<i id='btnNewPlantAdd' class='btnHelper btnInner btnLeft fa fa-fw fa-upload' title='Add your new plant'></i>"

      // todo: icon to submit a plant will go here

      txt += "</td>";
      // remaining blank cells for all columns other than the name (above) and picture (below)
      for (let i = 1; i < l; i++) {
        txt += `<td tabindex='${l+i+1}'></td>`;
      }
      // blank cell for the picture cell
      txt += "<td title='The upload image functionality is not yet available'>image</td></tr>"

      // add a table footer with text about entering new plants and list the sources;
      txt += `</tbody>
      <tfoot>`;

      // add notes regarding entering new plants
      txt += `<tr class="notesRefs">
      <td colspan=${colSpan} class="notesReferences">
        Use the blank row above to add new plants to your table view. The data will be saved to your own computer using Local Storage (similar to cookies).
        </td>
      </tr>
      <tr class="notesRefs">
        <td colspan=${colSpan} class="notesReferences">
        Do NOT store any personal or sensitive information here.
        </td>
      </tr>`
    }
    // if local storage is not available but it's still a desktop, add a note about local storage
    else {
      txt += `</tbody>
      <tfoot id="newPlantNote">
      <tr class="notesRefs">
        <th colspan=${colSpan} class="notesReferences">
        Local storage is not available on this machine. The local file restrictions might be on. Disable at your own risk.
        </th>
      </tr>`;
    }
    txt += `<tr class="notesRefs"><td colspan=${colSpan} class="notesReferences">&nbsp;</td></tr>
  <tr class="notesRefs"><td colspan=${colSpan} class="notesReferences">&nbsp;</td></tr>`
  }

  // add references, spanning them 3 columns on mobile, 12 on desktop, close the table tags and append the html
  txt += `<tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    The data collected here comes from the internet, especially Wikipedia and the very informative websites listed below, as well as many nurseries and my own experience.
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    Please note, that by providing links to other sites, this web page does not guarantee their safety nor approve, guarantee or endorse the information or products available on these sites.
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="http:// www.audubon.org/">Audubon</a>
    &nbsp;or
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="http:// nc.audubon.org/conservation/bird-friendly-communities/bird-friendly-native-plants/native-plant-profiles">NC Audubon</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.ncwildflower.org/native_plants/recommendations">NC Native Plant Society</a>
    &nbsp;or
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.wildflower.org">Lady Bird Johnson Wildflower Center</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.ces.ncsu.edu/">NC State Extension</a>
    &nbsp;or
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// plants.ces.ncsu.edu/plants/category/all/">Plant Selection at NC State Extension</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// ncbg.unc.edu">NC Botanical Garden</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="http:// www.missouribotanicalgarden.org/gardens-gardening.aspx/">Missouri Botanical Garden</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// davesgarden.com/">Dave's Garden</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.clemson.edu/extension/">Clemson Cooperative Extension</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// uswildflowers.com/">US Wildflowers</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.prairiemoon.com/">Prairie Moon Nursery</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// www.illinoiswildflowers.info/">Illinois Wildflowers</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="www.americanmeadows.com">American Meadows</a>
    </td>
  </tr>
  <tr class="notesRefs">
    <td colspan=${colSpan} class="notesReferences">
    <a target="blank" href="https:// gnps.org">Georgia Native Plant Society</a>
  </td>
  </tfoot>
  </table>`;
  table.innerHTML += txt;
}

// after the table is populated, this function creates menu lists for the I/E and View buttons in Navbar
function menuSetup() {
  // creating the column drop down menu, used in custom view
  addDropDown("dropColNames", arrHeaders);

  // adding export/import menu sub choices here just to keep it together
  // the Export/Import are separated from the rest of the choice name by no space
  // on purpose, this is used later in code, the rest needs to not be \xa0
  addDropDown("dropExportImport",
  ["Export\xa0Notes", "Export\xa0Status", "Export\xa0Garden Location"
  , "Import\xa0Notes", "Import\xa0Status", "Import\xa0Garden Location"
  // todo: maybe add an option to export/import user added plants
  // , "Export\xa0Your\xa0Plants", "Import\xa0Your\xa0Plants"
]);
}

// if data has been filtered in this session and filters are stored in session storage, retrieve them and filter the table rows
function checkFilteredRowsCols() {
  if (sessionStorage.filters) {
    filters = JSON.parse(sessionStorage.filters);
    for (i in filters) {
      // min/max height and width support
      if (filters[i][">"]) {
        table.children[0].children[1].children[i].children[0].value =
        filters[i][">"] + "-" + filters[i]["<"];
        filterData();
      }
      else {
        // if data is filtered by size
        if (filters[i][">"] || filters[i]["<"]) {
          table.children[0].children[1].children[i].children[0].value =
            filters[i][">"] + " - " + filters[i]["<"];
        }
        // if data is filtered with multiple choices that are not size
        else if (Array.isArray(filters[i]) && filters[i].length > 1) {
          table.children[0].children[1].children[i].children[0].value = "...";
          }
        // else, if one filter choice
        else {
          table.children[0].children[1].children[i].children[0].value = filters[i].toString().toLowerCase();
        }
        filterData();
      }
      addClearingBtn(table.children[0].children[1].children[i]);
    }
  }

  // check the view type in session storage and adjust the view if needed
  // full view is not stored, thus for it the following clause is skipped
  if (sessionStorage.hiddenColumns) {
    // if there are hidden columns, update the View Button's text;
    document.getElementById("btnView").innerText = sessionStorage.viewName;
    let hiddenCols = sessionStorage.hiddenColumns.split(",");
    // format the column names in the dropdown
    for (let i = 0, l = arrHeaders.length; i < l; i++) {
      // if the column is listed in sessionStorage.hiddneColumns, hide that column
      if (hiddenCols.includes(arrHeaders[i])) {// } .replace(" ","\xa0"))) {
        customColumnDisplay(i, false);
      }
    }
    $("#btnCustomCols").show();
  }
}

//////////////////////////////////////////////////////////////////////
// click on one of Export/Import options
function impExp(tgt) {
  // split the text of clicked choice into specs [status, column]
  let specs = tgt.innerText.split("\xa0");

  // create a div to hold the text area and the "done" button
  let displayDiv = document.createElement("div");
  displayDiv.className = "expImp";
  document.body.appendChild(displayDiv);

  // create the text area for the input or output data
  let displayTextArea = document.createElement("textarea");
  displayTextArea.cols = "20";
  displayTextArea.rows = "10";
  displayDiv.appendChild(displayTextArea);
  displayTextArea.focus();

  // cancel button closes the window
  let displayCancelBtn = document.createElement("button");
  displayCancelBtn.innerHTML = "&times;";
  displayCancelBtn.className = "expImp btnRight btnHelper btnInner";
  displayCancelBtn.title = "Click to Close";
  displayDiv.appendChild(displayCancelBtn);

  let displayDoneBtn = document.createElement("i");
  displayDoneBtn.className = "btnLeft btnHelper btnInner fa fa-fw";
  displayDiv.appendChild(displayDoneBtn);
  // hide the button until the correctly formatted text entry is made or until it's verified that there is data to be exported
  displayDoneBtn.style.display = "none";

  // on export, get the data from local storage, clean & display it in the text area;
  if (specs[0] === "Export") {
    displayTextArea.className = "exp";

    displayDoneBtn.classList.add("exp");
    displayDoneBtn.classList.add("fa-cut");
    let data = JSON.parse(localStorage.getItem("gDb_" + specs[1].replace(/ /g, "")));
    if (!data) {
      displayTextArea.placeholder = "You don't have any "+specs[1]+" stored in Local Storage";
      return;
    }
    // unhide the done button, since there is data to export
    displayDoneBtn.style.display = "block";

    displayTextArea.value = specs[1]+'\n"';

    let i = 0;
    for (x in data) {
      // the last entry is treated differently: it's removed because it's an empty string
      if (i === Object.entries(data).length-1) {
        displayTextArea.value += x+'":"'+data[x].replace(/\n/g,"").substring(0,data[x].length)+'"';
      }
      // for all entries, other than last one, remove trailing new line characters, replace " with ' and append ", followed by new line and " at the end
      else {
      displayTextArea.value += x+'":"'+data[x].replace(/\n/g,"").replace(/"/g, "'")+'",\n"';
      }
      i++;
    }
    // update assisting text for done button
    displayDoneBtn.title = "Click to copy the text and close this window. "
      +"Once copied, the text can be uploaded to this page on another devise. "
      +"A portable drive, email or other means can be used to move this text from this "
      +"device to another. When importing the data, reload the page to view changes.";
  }

  // else, import is clicked; the data is pasted or entered by the user into the window; the data must be in the correct format: "name":"text"; the functionality below is added to the button to clean up and load the data to local storage; the page is then refreshed to display the additon
  else {
    displayTextArea.className = "imp";

    displayDoneBtn.classList.add("imp");
    displayDoneBtn.classList.add("fa-upload");
    // the value indicates notes, status or location
    displayDoneBtn.value = specs[1];

    // update assisting text for the text area
    displayTextArea.placeholder = "Paste the " + specs[1] + " data here. The data copied from "
    + "this page on another device is in the required format: \"Latin Name\":\"" + specs[1] + " text\". ";
  }
}

function compareArrays(arr1, arr2) {
  if (arr1.length === arr2.length) {
    for(let i = 0, len = arr1.length; i < len; i++) {
      if (arr1[i] != arr2[i]) {
        return false;
      }
    }
  }
  return true;
}
//////////////////////////////////////////////////////////////////////
// check if data's been added by the user and, if yes, append it to the table;
function checkStoredData() {
  // if the existing row counter is retrieved, it is recorded in the addedRowCounter variable
  const plantCounter = localStorage.getItem("gDb_rPlntsCntr");
  if (plantCounter === "undefined" || plantCounter === null || plantCounter === "") {
    // if gDb_rPlntsCntr has not been set in local storage before, there is no existing data to pull, thus return
    return;
  } else {
    // the addedRowCounter is an array variable that stores the rows that have been added by a user to their local storage
    addedRowCounter = plantCounter.split(",");
  }

  // check the stored plants column order; the gDb_colOrder stores the column headers in the order that the data is locally stored; whenever the order is changed in plants.json, the headers arrays won't match and the program will rearrange locally stored data and update gDb_colOrder; if there is a plant entry and no gDb_colOrder, it means the entry is very old and is in the original order - thus needs to be rearranged; if there is a change in a column name, the oldName-newName entry needs to be permanently recorded in the colNameChanges object;
  const colOrder = localStorage.getItem("gDb_colOrder");

  const storedColOrder = colOrder?Array.from(colOrder):['Latin\xa0Name','Name','Notes','Status','Class','Height','Width','Color','Leaves','Bloom\xa0Time','Fruit\xa0Time','Sun','Roots','Garden\xa0Location','Natural\xa0Habitat','Origin','Wildlife','Companions','Enemy','Soil','When\xa0To\xa0Plant','Days\xa0To...','How\xa0To\xa0Prune','When\xa0To\xa0Prune','Food\xa0And\xa0Water','How\xa0To\xa0Plant','When\xa0To\xa0Feed','Propagating','Problems','Picture'];

  let currColOrder = compareArrays(arrHeaders, storedColOrder);
  // loop through user-added stored plants using stored plant counter
  addedRowCounter.forEach(plnt => {
    if (!currColOrder){
      // if stored column names are not in the right current order, rearrange them, but keep the latin name first, before the common name
      let rearrangedSavedPlant = [];
      try {
        let savedPlant = JSON.parse(localStorage.getItem("gDb_plnt" + plnt));
        for (let i = 0, len = arrHeaders.length; i < len; i++) {
          // keep latin name before common name, as it is in plants.JSON, even though it's reversed for display
          if (i === 0) {
            rearrangedSavedPlant.push(savedPlant[storedColOrder.indexOf("Latin\xa0Name")] || '');
          } else if (i === 1) {
            rearrangedSavedPlant.push(savedPlant[storedColOrder.indexOf("Name")] || '');
          } else {
            rearrangedSavedPlant.push(savedPlant[storedColOrder.indexOf(arrHeaders[i])] || '');
          }
        }
      } catch (error) {
        throw error;
      }
      // store the plant values in the correct current order, overwriting the old entry
      localStorage.setItem("gDb_plnt" + plnt, JSON.stringify(rearrangedSavedPlant));
    }
    // plnt is the row record number here, used in the triggered appendPlanToTable() function to pull stored plants using their keys
    appendPlantToTable(plnt);
  })
    // update stored column order
    if (!currColOrder) localStorage.setItem("gDb_colOrder", JSON.stringify(arrHeaders));
}

//////////////////////////////////////////////////////////////////////
// this function appends row(s) to the table with stored or new plant's data
function appendPlantToTable(iD) {
  try {
    let arrStoredPlant = JSON.parse(localStorage.getItem("gDb_plnt" + iD));

    // insert a new row at the bottom of the table, but before the very last row, dedicated for adding new data
    let row = table.insertRow(tdRowCnt);
    // increment the table row keeper
    tdRowCnt++;

    // assign class addedRow to the rows added by user, so that they can be accessed for editing
    row.className = "addedRows";
    row.id = iD;

    // on key up, add an 'update' button to the name field of a user added plant;
    // if the number of children is 3, the button's already added
    row.addEventListener("keyup", function() {
      if (row.children[0].childElementCount < 3) {
        row.children[0].appendChild(addInnerButton('u', addedRowCounter[iD]));
        }
    });

    // write the user added plants data into the table
    for (let j = 0, len = table.rows[0].cells.length; j < len; j++) {

      let newCell = row.insertCell(j);

      // special treatment of index 0, name, as it is frozen and has inner buttons to allow editing and removal of added plants
      if (j === 0) {
        newCell.className = "frozenCol";
        let newDiv = document.createElement("div");
        newDiv.contentEditable = "true";
        newDiv.appendChild(document.createTextNode(arrStoredPlant[1]));
        newCell.appendChild(newDiv);
        // add a delete button to the name cell
        newCell.appendChild(addInnerButton('d', addedRowCounter[iD]));
      }
      // latin name
      else if (j === 1) {
        // latin name (index 0) of user added plants is recorded in an unqLatinNames array;
        unqLatinNames.push(arrStoredPlant[0]);
        newCell.contentEditable = "true";
        newCell.appendChild(document.createTextNode(arrStoredPlant[0]));
      }
      else if (j === len - 1) {
        // image - to be todo
        newCell.appendChild(document.createTextNode(arrStoredPlant[j]));
      }
      else {
        // add the text node to the newly inserted row's each cell
        newCell.appendChild(document.createTextNode(arrStoredPlant[j]));
        newCell.contentEditable = "true";
      }
    }
  } catch (error) {
    console.log("error triggered catch in appendPlantToTable function")
    throw error;
  }
}

//////////////////////////////////////////////////////////////////////
// check if the latin name already exists; latin name is the key thus must be unique
function checkLatinName(latinName) {
  if (unqLatinNames.indexOf(latinName) > -1) {
    return false;
  } else {
    return true;
  }
}

//////////////////////////////////////////////////////////////////////
// this function allows support for users to add their new plants; this functionality is only available  if the user's browser supports localStorage and restrictions are disabled.
function storeNewPlant() {
  // check if the unqLatinNames array already has the latin name that the user wants to add
  if (!checkLatinName(newRow.children[1].textContent)) {
    alert(`A plant with latin name ${newRow.children[1].textContent} already exists.`);
    return;
  } else if (newRow.children[0].textContent.length === 0 && newRow.children[1].textContent.length === 0) {
    alert("Please provide a latin name for your plant.");
    return;
  }

  let recordNumber = 0;
  // if the length of addedRowCounter is not 0 and addedRowCounter exists, set the record number to the VALUE of the last element (length minus one) in the addedRowCounter plus one.
  if (addedRowCounter) {
    if (addedRowCounter.length > 0) {
      recordNumber = Number(addedRowCounter[addedRowCounter.length - 1]) + 1;
    }
  }
  // update the addedRowCounter - an array, stored in local storage, that keeps track of user added plants
  addedRowCounter.push(recordNumber.toString());
  localStorage.setItem("gDb_rPlntsCntr", addedRowCounter);

  // when a plant is added to local, it's stored in the original order, latin name before common
  addToLocal(newRow, recordNumber);

  // add the new plant to the table
  appendPlantToTable(recordNumber);

  // if there isn't one, create a column order number entry in local storage to reflect the current order
  if (!localStorage.getItem("gDb_colOrder")) localStorage.setItem("gDb_colOrder", JSON.stringify(arrHeaders));

  // hide any hidden columns for the newly added plants
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
// this function adds the user added plant data to local storage (updates
// or adds new), ensuring the data is in the right order
function addToLocal(row, recordNumber) {
  if (recordNumber === undefined) recordNumber = row.id;

  // the column order of user added plants is verified during initial page load

  let arrNewPlantVal = [];
  // record new plant's values in arrNewPlantVal array
  for (let i = 0; i < arrHeaders.length; i++) {
    // for the common name (index 0), the text is inside the div inside td
    if (i === 0) {
      arrNewPlantVal.push(row.children[1].childNodes[0].textContent.toString());
    }
    else if (i === 1) {
      arrNewPlantVal.push(row.children[0].textContent.toString());
    }
    // for photo, place 0 until the functionality to upload photos is ready
    else if (i === arrHeaders.length - 1) {
      arrNewPlantVal.push("");
    }
    else {
      arrNewPlantVal.push(row.children[i].textContent.toString());
    }
  }

  localStorage.setItem("gDb_plnt" + recordNumber, JSON.stringify(arrNewPlantVal));
}

//////////////////////////////////////////////////////////////////////
// when changes are made to a user-added plant, this function updates
// the local storage and the table with those changes
function saveEditedPlant(callingRow) {

  // first, record the new plant in the local storage
  addToLocal(callingRow, callingRow.id);

  // next, update the table with the new plant, pulling the new data from local storage
  appendPlantToTable(Number(callingRow.id));

  // last, clear the row for adding new plants
  callingRow.remove();
}

//////////////////////////////////////////////////////////////////////
// triggered when the delete button is clicked in the new plant row,
// this function starts the process of deleting a user-added plant
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
  localStorage.removeItem("gDb_plnt" + callingRow.id);

  // update the row counter in local storage
  if (addedRowCounter.length > 0) {
    localStorage.setItem("gDb_rPlntsCntr", addedRowCounter);
  } else {
    // if no more added plants, remove the counter and column order entries as well
    localStorage.removeItem("gDb_rPlntsCntr");
    localStorage.removeItem("gDb_colOrder");
  }
  // delete the row from the table
  callingRow.remove();
  // remove from unqLatinNames
  unqLatinNames.splice(unqLatinNames.indexOf(callingRow.children[1].innerText), 1);
}

//////////////////////////////////////////////////////////////////////
// this function loops through new plant row emptying user-entered values
function clearNewPlant() {
  for (let i = 0, len = table.rows[0].cells.length; i < len; i++) {
    if (i === 0) {
      // name column gets special treatment, as the text is inside a childNode (div)
      newRow.children[i].childNodes[0].innerText = "";
    } else {
      newRow.children[i].innerText = "";
    }
  }
}

//////////////////////////////////////////////////////////////////////
// add mini buttons update(u) and delete(d) functionality
// inside the name cells of plants added by user
function addInnerButton(type) {
  let btn = document.createElement("i");
  if (type === 'd') {
    btn.className = "btnHelper btnInner btnRight btnDeletePlant fa fa-fw fa-cut";
    btn.title = "Delete";
  } else if (type === 'u') {
    btn.className = "btnHelper btnInner btnLeft btnUpdatePlant fa fa-fw fa-upload";
    btn.title = "Update";
  }
  return btn;
}

//////////////////////////////////////////////////////////////////////
// this function is triggered on key up within the body of the table
// it adds buttons to the name of a plant whose notes, status or garden location fields are being modified
function addBtnUsrChgs(clickedCell, e) {
  // exit, if the user is editing a plant that they've added..
  if (clickedCell.parentElement.className === "addedRows"
      || clickedCell.parentElement.id === "newPlantRow"
      // ..or there is not text and this wasn't a paste (note: cell is blank when the data is just pasted)
      || !(clickedCell.innerText) && e.type != "paste"
      // or a tab, shift, left, up, right, down or window tab keys is pressed
      || [9, 16, 37, 38, 39, 40, 91].includes(e.keyCode)
      // or a backspace(8), enter, or space is pressed and there is no text yet
      || [13, 32].includes(e.keyCode) && !(clickedCell.innerText.trim().length)
     ) {
    return;
  };

  // if the text in the cell is a space(30) or a return(10), remove it by replacing with empty quotes
  if ([10,30].includes(clickedCell.innerText.charCodeAt()) || isNaN(clickedCell.innerText.charCodeAt())) {
    clickedCell.innerText = "";
  };

  let colName = arrHeaders[clickedCell.cellIndex].replace(/\s/g,"");
  // ***for special treatment of Notes***
  // for Notes field, capture the original text in a origNotes attribute; that way when the user makes changes, only the changes are captured in local storage
  // if (colName === "Notes") {
  //   if (!clickedCell.attributes.origNotes) {
  //     clickedCell.attributes.origNotes = clickedCell.innerText;
  //   }
  // }

  // retrieve an entry stored in local storage for this plant and field
  let strStoredText = JSON.parse(localStorage.getItem("gDb_" + colName));
  // compare user entered text to the text in local storage:
  // if no stored text and no text in the cell
  // or stored text and typed text is the same as stored
  let sameText = !strStoredText && !clickedCell.innerText.trim().length
  || strStoredText && clickedCell.innerText.trim() === strStoredText[clickedCell.parentElement.children[1].innerText];
  // ***for special treatment of Notes***
  // or no stored text and origNotes attribute has been created and the remaining text is blank
  // or origNotes attribute has been created and the remaining text is the same as stored
  // || !strStoredText && !clickedCell.innerText.slice(clickedCell.attributes.origNotes.length).trim().length
  // || strStoredText && clickedCell.innerText.slice(clickedCell.attributes.origNotes.length).trim() === strStoredText[clickedCell.parentElement.children[1].innerText];

  // the update button is the first child of the first column (name, index 0)
  let btn = clickedCell.parentElement.children[0].children[0];

  // if there aren't any children (buttons) in the name column
    if (!btn) {
    // exit, if the user entry matches local storage
    if(sameText) {
      return;
    };
    // create a button for saving user changes and include the index number of the updated column in the button's value
    btn = addInnerButton('u');
    btn.value = clickedCell.cellIndex.toString();
    clickedCell.parentElement.children[0].appendChild(btn);
  }
  // ... if there is already a button in the name column, then update the button's value to include the index number of the modified column or remove the index if the user has deleted or undone all the changes they were typing
  else {
    // the index numbers of modified columns are stored in button's value
    let arrModifiedCols = btn.value.split(",");
    // if the index of modified column isn't already in the button's value, add it
    if (!arrModifiedCols.includes(clickedCell.cellIndex.toString())) {
      arrModifiedCols.push(clickedCell.cellIndex);
    }
    // else, if the index is already in button's value but the text changes have been undone, remove
    else if (sameText) {
      arrModifiedCols.pop(clickedCell.cellIndex);
    }
    // remove the button if all the indices have been removed from button's value;
    if (arrModifiedCols.length === 0) {
      btn.parentElement.removeChild(btn);
    }
    // otherwise, update button's value to reflect all dirtied column indices
    else {
      btn.value = arrModifiedCols.toString();
    }
  }
}

//////////////////////////////////////////////////////////////////////
// this function is called when a user clicks on save changes button
// for a plant with modified notes, status, or garden location fields
// it loads the changes into local storage
function updateExistingPlant(btn) {
  // record which column(s) were modified; if more than one, the value will have the index numbers separated by commas
  let modifiedFields = btn.value.indexOf(",");
  if (modifiedFields > -1) {
    modifiedFields = btn.value.split(",");
  } else {
    modifiedFields = Array(btn.value);
  }
  // loop through the array of modified column indexes
  for (let i = 0, l = modifiedFields.length; i < l; i++) {
    // remove any spaces from columns names
    let colName = arrHeaders[Number(modifiedFields[i])].replace(/\s/g, "");
    // if this field already has entries in local storage, retrieve them;
    let parsedStoredData = {};
    // parse the results returned from local storage entries
    if (localStorage.getItem("gDb_" + colName)) {
      parsedStoredData = JSON.parse(localStorage.getItem("gDb_" + colName));
    }
    //
    let modifiedText = btn.parentElement.parentElement.children[Number(modifiedFields[i])].innerText;
    // if the user cleared the notes, status, etc., delete that entry from local storage
    if (modifiedText.length === 0 || modifiedText === "\n" || modifiedText === "/u21B5") {
      delete parsedStoredData[btn.parentElement.parentElement.children[1].innerText];
    }
    // otherwise, update/create entry with notes, status, or location
    else {
      parsedStoredData[btn.parentElement.parentElement.children[1].innerText] = modifiedText.trim();
    }
    // if notes, status, location entries has been deleted for all plants
    if (Object.entries(parsedStoredData).length === 0) {
      localStorage.removeItem("gDb_" + colName);
    }
    else {
      localStorage.setItem("gDb_" + colName, JSON.stringify(parsedStoredData));
    }
  }
  btn.parentElement.removeChild(btn);
}

//////////////////////////////////////////////////////////////////////
// this function copies the data of an existing plant into the new
// plant row for modifying it and saving on user's local machine
function copyRow(clickedElt) {
  let plantName = clickedElt.innerHTML;
  let tr = table.getElementsByTagName("tr");
  let rw = 0;
  // find the order number of the needed plant by searching for its name (plantName) in the array (tr) children, start at i=2 skipping headers and filters
  for (let i = 2; i < tdRowCnt; i++) {
    if (plantName === tr[i].children[0].innerText) {
      rw = i;
      break;
    }
  }
  // hide the menu
  clickedElt.parentElement.parentElement.removeChild(clickedElt.parentElement);
  for (let i = 0, l = newRow.children.length; i < l; i++) {
    // the second column (i==0, name) has input type text and is updated differently
    if (i === 0) {
      newRow.children[i].childNodes[0].innerText = table.rows[rw].children[i].innerText;
    } else {
      newRow.children[i].innerText = table.rows[rw].children[i].innerText;
    }
  }
  newRow.contentEditable = true;
}

//////////////////////////////////////////////////////////////////////
// this function sorts the data in the table by the clicked column; it's triggered by user clicking on the column header, 1st click: asc, 2nd: desc
function sortTable(colNum) {
	  let i = 2,
        x = 0,
        y = 0,
        xValue = null,
        yValue = null,
        switching = true,
        sortAsc = true;
  // determine sorting (ascending or descending) by comparing values in the first two data rows, more, if the first two are the same; start at i = 2, skipping headers and filters;
  for (i; i < tdRowCnt-1; i++) {
    if (table.rows[i].children[colNum].innerText === table.rows[i+1].children[colNum].innerText) {
     continue;
    } else if (table.rows[i].children[colNum].innerText > table.rows[i+1].children[colNum].innerText) {
      break;
    } else {
      sortAsc = false;
      break;
    }
  }

  // Make a loop that will continue until no switching can be done
  while (switching) {
    // no switching has been done at first
    switching = false;
    let shouldSwitch = false; // there should be no switching at first
    // Loop through all table rows, starting at i = 2, skipping headers and filters and ending 1 short, because for filtering we're looking at the next row?
    for (i = 2; i < tdRowCnt-1; i++) {
      // get the two elements to compare, one from current row and one from the next
      x = table.rows[i].getElementsByTagName("td")[colNum];
      y = table.rows[i+1].getElementsByTagName("td")[colNum];
      // check if the two rows should switch places by looking at text contents of each  cell; for the added plants, the name is treated differently by looking at the value of the first child[0]
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
  // If a shouldSwitch has been marked, make the switch and mark that a switch has been done
    if (shouldSwitch) {
      table.rows[i].parentNode.insertBefore(table.rows[i+1], table.rows[i]);
      switching = true;
    }
  }
}

//////////////////////////////////////////////////////////////////////
// filtering of the height/width columns' min/max range, special case
function filterBySizeRange(evt) {

  let clickedElt = evt.target;
  // forCell is a table data cell <td> of the Frozen Filter Row
  let forCell = clickedElt.parentElement.parentElement.parentElement;

  // create min/max nested entries in filters{} object
  if (!filters[forCell.cellIndex]) {
    filters[forCell.cellIndex] = {
      ">": "",
      "<": ""
    };
  }

  // add the appropriate min/max value entries in the filter{} object for < and > keys
  if (clickedElt.className === "inputRangeMin") {
    filters[forCell.cellIndex][">"] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text")));
  } else if (clickedElt.className === "inputRangeMax") {
    filters[forCell.cellIndex]["<"] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text")));
  }

  filterData();

  // create/update the placeholder which is displayed in the filter cell, put blank when no min/max values
  if (forCell.getElementsByClassName("inputRangeMin")[0].value.length === 0
      && forCell.getElementsByClassName("inputRangeMax")[0].value.length === 0) {
    forCell.children[0].placeholder = "";
    removeClearingBtn(forCell); // this takes care of sessionStorage too
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
// response for filtering fields, other than the special min/max range of width/height
function filterByText(evt){
  let clickedElt = evt.target;
  // if a value is typed in a width or height column, clear the placeholder, which might've been populated before, from using range feature
  if (['Width', 'Height'].includes(arrHeaders[clickedElt.parentElement.cellIndex])) {
    clickedElt.placeholder = "";
  }

  // if a unique to column values dropdown menu is displayed, remove it - remove all 3
  if (clickedElt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
    clickedElt.parentElement.removeChild(clickedElt.parentElement.getElementsByClassName("dropUnqVals")[0]);
  }

  // create/overwrite an entry in filters object with text typed or pasted
  filters[clickedElt.parentElement.cellIndex] = (clickedElt.value || ((evt.clipboardData || window.clipboardData).getData("text"))).toUpperCase();

  // filter the table data; the called function uses filters object, so it must be updated first (above)
  filterData();

  // add the clearing button (scissors) to the filter field
  sessionStorage.filters=JSON.stringify(filters);
  addClearingBtn(clickedElt.parentElement);
}

//////////////////////////////////////////////////////////////////////
// response to the clicks on the filter clearing buttons
function clearFilter(clickedElt) {

    let forCell = clickedElt.parentElement;
    let grandpa = forCell.parentElement.parentElement;

    // for min/max height/width ranges, remove the emptying button from grandparent & clear placeholder
    if (clickedElt.className === "inputRangeMin") {
      // if only the min value is shown in placeholder, the dash is the last character, thus clear the placeholder
      let dashPos = grandpa.children[0].placeholder.indexOf("-");
      if (dashPos === grandpa.children[0].placeholder.length-1) {
        removeClearingBtn(grandpa);
        grandpa.children[0].placeholder = "";
      }
      // if the max is also shown in placeholder, then only clear the min
      else {
        grandpa.children[0].placeholder = grandpa.children[0].placeholder.substr(dashPos, grandpa.children[0].placeholder.length-1);
      }
    }
    else if (clickedElt.className === "inputRangeMax") {
      // if only the max value is shown in placeholder, the dash is the first character, thus clear the placeholder
      let dashPos = grandpa.children[0].placeholder.indexOf("-");
      if (dashPos === 0) {
        removeClearingBtn(grandpa);
        grandpa.children[0].placeholder = "";
      }
      // if the min is also shown in placeholder, then only clear the max
      else {
        grandpa.children[0].placeholder = grandpa.children[0].placeholder.substr(0,dashPos);
      }
    }
    else {
      removeClearingBtn(forCell);
      forCell.children[0].placeholder = "";
      cleanView();
    }
    // call filter data with empty parameters to unfilter the table
    filterData();
}


//////////////////////////////////////////////////////////////////////
// this function is called when a user enters text in the filter
// (2nd) row or picks from filtering drop down choices
// it filters the rows displayed in the plants table using the text entered
function filterData() {

  let keptRows = 0;

  // loop through table data rows starting at i = 2, skipping headers and filters
  for (let i = 2; i < tdRowCnt; i++) {

    // set the showFlag to true, meaning every row is shown initially
    let showFlag = true;

    // loop through the filters object to check all fields where filtering criteria are set
    for (let key in filters) {

      // i is the row, td is the cell, key is the column index
      let td = table.rows[i].children[key];
      let cellContents = null;

      // because of the frozenCol class, the value of column name for the user added plants is inside an input field (child 0), thus has to be accessed through a child's value
      if (key === "1" && td.children.length > 0) {
        cellContents = td.children[0].value.toUpperCase();
      } else {
        cellContents = td.textContent.toUpperCase();
      }

      // when an entry is made in a height/width min/max fields
      if (!Array.isArray(filters[key]) && typeof filters[key] === "object") {
        // the values of min & max range fields of width & height have > or < in the value
        if (filters[key][">"]) {
          // check if min width or height is in inches (double quotes or two single quotes)
          if (cellContents.includes("''") || cellContents.includes('"')) {
            // the following RegEx gets each size spec: digit followed by two single quotes or double quotes; each output is parsed into Int via map(), if larger than min specified in filters[key] then 1, if the sum of all comparisons is 0, don't show
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
          // check if min width or height is in inches (double quotes or two single quotes)
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

      // when there is cick on filter one or more drop down choices
      if (Array.isArray(filters[key])) {
        // if one of the "when..." columns is filtered, add months to the selected season
        if (filters[key]) {
          if (filters[key].includes('WINTER') && !filters[key].includes("DEC")) {
            filters[key].push('DEC', 'JAN', 'FEB');
          }
          if (filters[key].includes('SPRING') && !filters[key].includes("MAR")) {
            filters[key].push('MAR', 'APR', 'MAY');
          }
          if (filters[key].includes('SUMMER') && !filters[key].includes("JUN")) {
            filters[key].push('JUN', 'JUL', 'AUG');
          }
          if (filters[key].includes('FALL') && !filters[key].includes("SEP")) {
            filters[key].push('SEP', 'OCT', 'NOV');
          }
        }
        let inFlag = false;
        for (let i = 0, len = filters[key].length; i < len; i++ ) {
          // if cell contents match filtered-in choice
          if (cellContents.includes(filters[key][i])) {
            inFlag = true;
            break;
          }
        }
        if (!inFlag) showFlag=false;
      }

      // when an entry is typed in the filter field
      if (typeof filters[key] === "string") {
        if (!cellContents.includes(filters[key])) {
          showFlag = false;
          break;
        }
      }

    }

    if (showFlag) {
      table.rows[i].style.display = "";
      keptRows++;
    }
    else {
      table.rows[i].style.display = "none";
    }
  }
  goUp();
  document.getElementsByTagName("h1")[0].innerText = `Plants Data (${keptRows})`;
}


//////////////////////////////////////////////////////////////////////
// this function pulls unique values from the column it was called and creates a drop-down menu with those values or displays min/max range input fileds;
function getUnqVals(forCell) {

  // hide any drop down menus
  cleanView();

  let dropList = document.createElement("ul");
  dropList.className = "dropUnqVals";
  forCell.appendChild(dropList);

  // determine the name of the column by pulling its index from arrHeaders
  const colName = arrHeaders[forCell.cellIndex];

  // columns width and height display min and max range input fields instead of unique values
  if (colName === "Height" || colName === "Width") {
    for (let i = 0; i < 2; i++) {
      let liText = document.createElement("li");
      let liInput = document.createElement("input");
      // liInput.type = "number";
      // there are only two LIs, min and max
      if (i === 0) {
        liText.appendChild(document.createTextNode("Min''\xa0\xa0\xa0\xa0\xa0"));
        liInput.setAttribute("class", "inputRangeMin");
        filters[forCell.cellIndex] ? liInput.value = filters[forCell.cellIndex][">"] : false;
      } else {
        liText.appendChild(document.createTextNode("Max''\t"));
        liInput.setAttribute("class", "inputRangeMax");
        filters[forCell.cellIndex] ? liInput.value = filters[forCell.cellIndex]["<"] : false;
      }
      liInput.setAttribute("type", "number");
      liInput.setAttribute("min", "0");
      liText.appendChild(liInput);
      dropList.append(liText);
    }
  }

  // all other non-size splitable and long text columns
  else {

    // the array rUnqVals holds unique values from the given column
    let rUnqVals = [];

    if (colName.substring(0,4) === "When") {
      rUnqVals = ["Winter", "Spring", "Summer", "Fall"];
    } else {
      // ----------//
      loopTableRows:
      // ----------//
      // loop through the table, starting at i = 2, skipping headers and filters
      for (let i = 2; i < tdRowCnt; i++) {
        // add value to the drop down if it hasn't been hidden (display isn't none)
        // OR the clicked column is already used for filtering (its index is in filters)
        // OR if pulling names to add a new plant
        if (table.rows[i].style.display != "none"
            || filters[forCell.cellIndex]
            || forCell.children[1].id === "btnNewPlantCopy") {

          // if not pulling names for a user to copy a plant, don't show filtered out values in the drop down (jump out of for loop)
          if (forCell.children[1].id != "btnNewPlantCopy") {

            // loop through filters object and exclude rows that are not included in filters
            for (key in filters) {

              // display(keep) all unique values for the clicked column
              if (Number(key) === forCell.cellIndex) {
                continue; // proceed to the next filter
              }

              // for columns other than clicked, loop through cells values; keep values that have been used for filtering and are recorded in filters, jump to loopTableRows if column's cell value is in not in filters
              if (!table.rows[i].children[key].innerText.toUpperCase().split(/, | \bor\b/).filter(x=>filters[key].slice(",").includes(x))) {
                continue loopTableRows;
              }
            }
          }

          // for splitable columns, the cell value is split so that each choice is listed individually; for example, if the colors are blue, red, purple, they're separated and each is only listed once

          let arrCellVals =
              splitableCols.includes(colName)?
              table.rows[i].children[forCell.cellIndex].innerText.split(/, | \bor\b |;/):
              [table.rows[i].children[forCell.cellIndex].innerText];

          arrCellVals.forEach(x=> {
          // only add the value if it's not already in the array, is not empty and not filtered out using columns other than clicked (the last one is taken care of earlier)
            if (rUnqVals.indexOf(x.trim()) === -1 && x.length > 0) {
              rUnqVals.push(x.trim());
            }
          })

        }
      }
      // sort the drop down values alphabetically
      rUnqVals.sort();
    }

    let alphaFlag = null;

    // add the drop down values to the UL dropList
    for (let i = 0, l = rUnqVals.length; i < l; i++) {
      let liText = document.createElement("li");
      liText.setAttribute("class", "customChoice");
      // create alphabet shortcut classes for the dropdowns
      if ( !alphaFlag || rUnqVals[i][0] > alphaFlag ) {
        alphaFlag = rUnqVals[i][0];
        liText.classList.add(rUnqVals[i][0].toLowerCase());
      }

      // format already-selected unique values, uless pulling names to add a new plant
      if (filters[forCell.cellIndex]
          && forCell.children[1].id.toString().substr(0,11) != "btnNewPlantCopy") {
        if (filters[forCell.cellIndex].includes(rUnqVals[i].toUpperCase())) {
          liText.classList.add("selectedCustomChoice");
        }
      }
      liText.appendChild(document.createTextNode(rUnqVals[i]));
      dropList.append(liText);
    }

  }

}

//////////////////////////////////////////////////////////////////////
// this function adds an inner button inside the filter field, for clearing
// text inside filter field, and a scissors button for clearing all filters
function addClearingBtn(toCell) {
  if (!toCell.getElementsByClassName("btnRight")[0]) {
    let delBtn = document.createElement("i");
    delBtn.className = "btnHelper btnInner btnRight fa fa-fw fa-cut";
    delBtn.title = "clear text";
    toCell.appendChild(delBtn);
  }
  $("#btnClearAllFilters").show();
}

//////////////////////////////////////////////////////////////////////
// this function removes the clearing button, first checking that it's there
function removeClearingBtn(fromCell) {
  let delBtn = fromCell.getElementsByClassName("btnRight")[0];
  // when removing the delete button, do the clean up:
  if (delBtn) {
    // clear the cell value and placeholder
    fromCell.children[0].value = "";
    fromCell.removeChild(delBtn);
    // delete the removed value from filters object
    delete (filters[fromCell.cellIndex]);
    // update the filters object in session storage or remove it if empty
		if (Object.keys(filters).length===0) {
      sessionStorage.removeItem("filters");
      $("#btnClearAllFilters").hide();
    } else {
      sessionStorage.filters=JSON.stringify(filters);
    }
  }
}

//////////////////////////////////////////////////////////////////////
// hide new plants buttons
function hideNewPlantBtns(tgtParents) {
  tgtParents.querySelector("#btnNewPlantClear").style.display = "none";
  tgtParents.querySelector("#btnNewPlantAdd").style.display = "none";
  // TODO: uncomment when code is ready
//   tgtParents.querySelector("#btnNewPlantSubmit").style.display = "none";
}

//////////////////////////////////////////////////////////////////////
// this function creates a UI list for a supplied UI using supplied values
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
// this function is called to hide or display columns for different views
function displayColumns(tgt) {
  let showColName = [];
  let viewOrder = ["Full", "Plan", "Care", "Min"];
  // when the end of the viewOrder is reached, go back to the beginning, Full View
  // update the button text and the name of the view, stored in session storage
  if (viewOrder.indexOf(tgt.innerText) === viewOrder.length -1) {
    tgt.innerText = viewOrder[0];
  }
  else {
    tgt.innerText = viewOrder[viewOrder.indexOf(tgt.innerText)+1];
  }

  // determine which columns to show, based on the view chosen
  switch (tgt.innerText) {
    case "Plan":
      showColName = ['Name','Notes','Status','Class','Height','Width','Color','Leaves','Bloom\xa0Time','Sun','Roots','Garden\xa0Location','Natural\xa0Habitat','Origin','Wildlife','Companions','Enemy','Soil','When\xa0To\xa0Plant','Picture'];
      break;
    case "Care":
      showColName = ['Name','Notes','Status','Soil','How\xa0To\xa0Plant','When\xa0To\xa0Plant','Days\xa0To...','How\xa0To\xa0Prune','When\xa0To\xa0Prune','Food\xa0And\xa0Water','When\xa0To\xa0Feed','Propagating','Problems','Picture'];
      break;
    case "Min":
      showColName = ['Name','Notes','Picture'];
      break;
    case "Full":
    default:
      // unhide hidden columns
      showColName = sessionStorage.hiddenColumns.split(",");
      break;
    }

  // hide/show columns and update session storage, recording hidden
  // columns only, full view (default) is not recorded; not using
  // storeHiddenCol() here, as it's easier to overwrite stored entry
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
    // update the view name in session storage
    sessionStorage.viewName = tgt.innerText;
    // capture hidden columns in session storage
    sessionStorage.hiddenColumns = arrHeaders.filter(x=>!showColName.includes(x));
    $("#btnCustomCols").show();
  }
}

//////////////////////////////////////////////////////////////////////
// this function toggles columns display
function customColumnDisplay(colNr, show) {
  let droppedElements = document.getElementById("dropColNames");
  if (show) {
    // show the clicked column; plus 1 for jQuery;
    $("td:nth-child(" + (colNr+1) + "),th:nth-child(" + (colNr+1) + ")").show();
    // style the clicked column's display in the drop down menu
      droppedElements.children[colNr].classList.remove("disabledCustomChoice");
  }
  else {
    // show the clicked column; plus 1 for jQuery;
    $("td:nth-child(" + (colNr+1) + "),th:nth-child(" + (colNr+1) + ")").hide();
    // style the clicked column's display in the drop down menu
    droppedElements.children[colNr].classList.add("disabledCustomChoice");
  }
}

//////////////////////////////////////////////////////////////////////
// the function updates session storage with the hidden columns,
// to keep the customized view for the duration of the session
function storeHiddenCol(colLiText, hide) {
  document.getElementById("btnView").innerText = "Cust";
  sessionStorage.viewName = "Cust";
  if (hide) {
    // show the columns drop down menu, the eye
    $("#btnCustomCols").show();
    // check if hiddenColumns exists in sessionStorage
    if (sessionStorage.hiddenColumns) {
      // if column name isn't already in hiddenColumns session storage, add it
      if (sessionStorage.hiddenColumns.split(",").indexOf(colLiText) === -1) {
	      sessionStorage.hiddenColumns += "," + colLiText;
      }
    }
    // otherwise, create hiddenColumns in sessionStorage using column name supplied
    else {
      sessionStorage.hiddenColumns = colLiText;
    }
  }
  else {
    // check if hiddenColumns exists in sessionStorage
    if (sessionStorage.hiddenColumns) {
      // create an array from hiddenColumns values
	    let storedHiddenCols = sessionStorage.hiddenColumns.split(",");
      if (storedHiddenCols.includes(colLiText)) {
        // remove the unhidden column name
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
// hide/remove all showing menus
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
  // hide the picture gallery
  document.getElementById("picGal").style.display="none";
  // hide the export/import menu view
  document.getElementById("dropExportImport").style.display = "none";
}


//////////////////////////////////////////////////////////////////////
// this function is triggered by a click or key entry anywhere on the page;
// it handles all events/functionality except:
// - update and delete inner buttons of user added plant buttons x3
function allClicks(e) {

  let tgt = e.target;

  // make cells editable when user double cicks on editable cell, those within notes, status, garden location
    if (e.type === "dblclick") {
      if (tgt.classList.contains("editableCol")) {
        // the following 'if block' clears selected text that always happens on double click
        if(document.selection && document.selection.empty) {
          document.selection.empty();
        } else if(window.getSelection() && !tgt.innerText.length) {
            var sel = window.getSelection();
            sel.removeAllRanges();
        }
        tgt.contentEditable = true;
        tgt.focus();
      }
    }

    let impTextFormatCheck = function(txt) {
      // validate the format of the data to import "Latin Name":"notes, status or location text"
      if (txt.search(/(\".+\":\".+\")/g) > -1) {
        return true;
      }
      else {
        return false;
      }
    }

    function pictureScroll(direction) {
      let increment = direction==="forward" ? 1 : -1;
      let arrowChildNum = direction==="forward" ? 1 : 2;

      try {
        let str = tgt.parentElement.children[0].src;
        tgt.parentElement.children[0].src =
        str.replace(
          str.match(/\d+.jpg/),
          parseInt(str.match(/\d+.jpg/))+ increment +'.jpg');

        // show the previous picture (left) button
        tgt.parentElement.children[arrowChildNum].style.display = "block";

        // if it's the first or last(max) file name number, hide the previous/next picutre button
        if (parseInt(tgt.parentElement.children[0].src.match(/\d+.jpg/)) === 1){
          tgt.style.display = "none";
        }
        if (parseInt(tgt.parentElement.children[0].src.match(/\d+.jpg/))
            === Number(tgt.parentElement.children[0].attributes.value.value)){
          tgt.style.display = "none";
        }
      }
      catch (error) {
        console.log("Error:"+error+". Unable to load next picture or other issues in response to the image gallery button click.")
      }
    }

  // -- key entries -------------------------------------------------
  if (e.type === "keyup") {
    // exit the function if the key clicked is a tab (9) or changing window tabs (91) and this is not a ctrl(cmd)+delete(backspace) click(91) in the editable fields or any key is clicked inside imp/exp text area
    if ((e.keyCode === 91 && !["filterInput","inputRangeMin","inputRangeMax"].includes(tgt.className) && !tgt.contentEditable)
       || e.keyCode === 9
       || tgt.classList.contains("exp")) {
      return;
    }
    // if return (13) or escape (27) keys are clicked
    if ((e.keyCode === 13 && tgt.tagName != "TEXTAREA") || e.keyCode === 27) {
      cleanView();
    }
    // if alphanumeric text is typed/edited in the filter row
    else if (tgt.classList.contains("filterInput") && tgt.value.match(/^.+$/)) {
      filterByText(e);
    }

    // if alphanumeric text is typed/edited in the min/max ranges of width/height columns
    else if (tgt.classList.toString().includes("inputRange") && tgt.value.match(/^.+$/)) {
      filterBySizeRange(e);
    }

    // if text is deleted from filtering fields, including size ranges
    else if (["filterInput","inputRangeMin","inputRangeMax"].includes(tgt.className)
      // .. or delete/erase key or ctrl(cmnd)+delete keys are pressed until all the text is erased
//       || [8,91].includes(e.keyCode) && tgt.value.length === 0
             && tgt.value.length === 0) {
      clearFilter(tgt);
    }

    // if text is typed within new plant row
    else if (tgt.id === "newPlantRow"
            || (tgt.contentEditable === "true" && tgt.parentElement.parentElement.id === "newPlantRow")) {
      tgt.parentElement.parentElement.querySelector("#btnNewPlantAdd").style.display = "block";
      tgt.parentElement.parentElement.querySelector("#btnNewPlantClear").style.display = "block";
      // disabled until code is ready
//       tgt.parentElement.parentElement.querySelector("#btnNewPlantSubmit").style.display = "block";
    }

    // if changes are made to Notes, Status, or Garden Location columns
    else if (["Notes", "Status", "Garden\xa0Location"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt, e);
    }

    // keyup in import window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      // if the data is in the correct format, display done button
      if (impTextFormatCheck(tgt.value)) {
        tgt.parentElement.children[2].title = "Click to upload your data and close this window. Once "
          +"uploaded, refresh the page to see the added data." ;
        tgt.parentElement.children[2].style.display = "";
      }
      else {
        tgt.parentElement.children[2].style.display = "none";
      }
    }

    // scroll through photos in the photo gallery on the arrow clicks
    else if (document.getElementById("picGal").style.display === "block") {
      let picGal = document.getElementById("picGal");
      // ["Right", "Down"].includes(e.keyIdentifier)  and  ["Left", "Up"].includes(e.keyIdentifier) // instead of keycode?

      if ([39,40].includes(e.keyCode) && picGal.children[2].style.display === "block") {
        tgt = picGal.children[2];
        pictureScroll("forward");
      }

      else if ([37,38].includes(e.keyCode) && picGal.children[1].style.display === "block") {
        tgt = picGal.children[1];
        pictureScroll("previous");
      }
    }

    // scroll to the right letters on letter click
    else if (document.getElementsByClassName("dropUnqVals").length) {
      let uList = document.getElementsByClassName("dropUnqVals")[0];
      let lItem = uList.getElementsByClassName(e.key.toLowerCase())[0];
      if (lItem) uList.scrollTop = lItem.offsetTop - 1;
    }

    // all other cases - roll up all the drop down menus
    else {
      cleanView();
    }
  }

  // -- data is pasted -------------------------------------------------
  else if (e.type === "paste") {
    // blank text is pasted
    if ((e.clipboardData || window.clipboardData).getData("text") === "") {
      return;
    }
    // alphanumeric text is pasted into filter row
    else if (tgt.className === "filterInput"
             && (e.clipboardData || window.clipboardData).getData("text").match(/^.+$/)) {
      filterByText(e);
    }
    // alphanumeric text is pasted into filtering min/max size ranges
    else if (["inputRangeMin", "inputRangeMax"].includes(tgt.className)
             && (e.clipboardData || window.clipboardData).getData("text").match(/^.+$/)) {
      filterBySizeRange(e);
    }
    // if data is pasted into editable Notes, Status, or Garden Location columns (not filter)
    else if (["Notes", "Status", "Garden\xa0Location"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt, e);
    }
    // if data is pasted into import window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      // if the data is in the correct format, display done button
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

  // -- data is cut -------------------------------------------------
  else if (e.type === "cut") {
    // alphanumeric text is cut/edited in a filter field
    if (tgt.className === "filterInput" && tgt.value.match(/^.+$/)) {
      filterByText(e);
    }
    // alphanumeric text is cut/edited in a filter field min/max size ranges
    else if (["inputRangeMin", "inputRangeMax"].includes(tgt.className) && tgt.value.match(/^.+$/)) {
      filterBySizeRange(e);
    }
    // all text is cut from a filter field, including size ranges
    else if ((tgt.className === "filterInput"
         || ["inputRangeMin", "inputRangeMax"].includes(tgt.className))
      && tgt.value.length === 0) {
      clearFilter(tgt);
    }
    // handle data cut from exp/imp window
    else if (tgt.classList.contains("imp") && tgt.tagName === "TEXTAREA") {
      tgt.parentElement.children[2].style.display = "none";
    }
    // if changes are made to Notes, Status, or Garden Location columns
    else if (["Notes", "Status", "Garden\xa0Location"].includes(arrHeaders[tgt.cellIndex])) {
      addBtnUsrChgs(tgt, e);
    }
    else return;
  }

  // -- mouse clicks or finger taps -------------------------------------------------
  else if (e.type === "click") {

    // clicks on up / down speedy buttons
    if (tgt.classList.contains("btnDn")) {
      cleanView();
      goDn();
    }
    else if (tgt.classList.contains("btnUp")) {
      cleanView();
      goUp();
    }

    // view settings
    // btnView is clicked: scroll through views
    else if (tgt.className === "fa fa-fw fa-cog" && tgt.parentElement.id === "btnView"
       || tgt.id === "btnView") {
      cleanView();
      displayColumns(tgt);
    }

    // a click on a table header's eye icon
    else if (tgt.classList.contains("fa-eye") && tgt.parentElement.tagName === "TH") {
      customColumnDisplay(arrHeaders.indexOf(tgt.parentElement.innerText), false);
      storeHiddenCol(tgt.parentElement.innerText, true);
    }

    // a click on an eye icon in the nav bar
    else if (tgt.className === "fas fa-eye" && tgt.parentElement.className === "navbar") {
      $("#dropColNames").toggle();
    }

    // a click on one of the custom drop down choices (column choices)
    else if (tgt.classList.contains("customChoice") && tgt.parentNode.id === "dropColNames") {
      if (table.getElementsByTagName("TH")[arrHeaders.indexOf(tgt.innerText)].style.display === "none") {
        customColumnDisplay(arrHeaders.indexOf(tgt.innerText), true);
        storeHiddenCol(tgt.innerText, false);
      }
      else {
        customColumnDisplay(arrHeaders.indexOf(tgt.innerText), false);
        storeHiddenCol(tgt.innerText, true);
      }
    }

    // an import/export button of navbar is clicked
    else if (tgt.id === "btnExportImport") {
      $("#dropExportImport").toggle();
      let expImpButton = document.getElementsByClassName("expImp");
      if (expImpButton[1]) {
        expImpButton[1].parentElement.parentElement.removeChild(expImpButton[1].parentElement);
      }
    }

    // when one of the Export/Import drop down choices is clicked - /TODO: replace export/import text area with a form to avoid quote format nightmare
    else if (tgt.classList.contains("customChoice") && tgt.parentNode.id === "dropExportImport") {
      // hide the Export/Import submenu
      $("#dropExportImport").hide();
      impExp(tgt);
    }

    // taps in the export/import text area
    else if ((tgt.classList.contains("exp")||tgt.classList.contains("imp")) && tgt.tagName === "TEXTAREA") {
      return;
    }

    // tap on the export/import close/cancel button
    else if (tgt.classList.contains("expImp") && tgt.classList.contains("btnRight")) {
      document.body.removeChild(tgt.parentElement);
    }

    // tap on the export done/go button: copy the data and close the window
    else if (tgt.classList.contains("exp") && tgt.classList.contains("btnLeft")) {
      tgt.parentElement.children[0].select();
      tgt.parentElement.children[0].setSelectionRange(0, 99999); // mobile
      document.execCommand("copy");
      document.body.removeChild(tgt.parentElement);
    }

    // tap on the import done/go button: format & load data into local storage
    else if (tgt.classList.contains("imp") && tgt.classList.contains("btnLeft")) {

      // ensure the correct JSON-parseable format of imported data "Latin Name":"notes, status or location text" by splitting the text's key value pairs, replacing double quotes with two singles ane recomposing

      // ..1. starting at the first double quote, thus skipping optional title,
      //  split the text using delimeter: double quote follower by comma follower by optional space
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

      // check if latin names of the imported entries exist
      for(key in JSON.parse(formattedEntry)){
        if (unqLatinNames.forEach(x => key.toUpperCase() === x.toUpperCase())){
          alert(`Latin name ${key} is not found. Entries can only be imported for plants that either exist in the table or are added by user.`);
          return;
        }
      }
      localStorage.setItem("gDb_" + tgt.value.replace(/ /g, ""),formattedEntry);
      document.body.removeChild(tgt.parentElement);
    }

    // click on column header, sort the table using the clicked column as key
    else if (tgt.tagName === "TH") {
      sortTable(e.target.cellIndex);
    }

    // click on a filtering drop down icon
    else if (["filterRow", "filterCell"].includes(tgt.parentElement.className)
               && tgt.classList.contains("fa-filter")) {
      // if the unique to column values are already populated (there is at least one), remove them; otherwise, add them by calling getUnqVals() funciton in the else clause below
      if (tgt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
        tgt.parentElement.removeChild(tgt.parentElement.getElementsByClassName("dropUnqVals")[0]);
        return;
      } else {
        getUnqVals(tgt.parentElement);
      }
    }

    // todo: need to rework filtering
    // click on a drop down choice
    else if (tgt.parentElement.parentElement
      && ["filterRow", "filterCell"].includes(tgt.parentElement.parentElement.className)
      && tgt.classList.contains("customChoice")) {

      // forCell is a table data cell <td> of the Frozen Filter Row
      let forCell = tgt.parentElement.parentElement;

      // if there isn't an array entry for this column number in filters, create a blank one; this is done so that the entry can then be searched for a clicked value
      if (!Array.isArray(filters[forCell.cellIndex])) {
        filters[forCell.cellIndex] = [];
      }

      // if the clicked choice is already in filters variable as column number:array of choices, remove it, change the formatting of the drop down choice back to the original & update sessionStorage
      if (filters[forCell.cellIndex].includes(event.target.innerText.toUpperCase())) {
        let i = filters[forCell.cellIndex].indexOf(event.target.innerText.toUpperCase());
        filters[forCell.cellIndex].splice(i, 1);
        tgt.classList.remove("selectedCustomChoice");
//         tgt.style.color = "navy";
//         tgt.style.backgroundColor = "rgba(204, 255, 153, 0.90)";
        sessionStorage.filters = JSON.stringify(filters);
        // if the removed element was the last one in array, remove the emptying button and delete that whole entry for the object, update sessionStorage
        if (filters[forCell.cellIndex].length === 0) {
          removeClearingBtn(forCell);
        }
        // if there is only one selection remaining, update the filter field to show it instead of ***
        else if (filters[forCell.cellIndex].length === 1) {
          forCell.children[0].value = filters[forCell.cellIndex][0].toLowerCase();
        }
      }
      // else, if the selected choice is not in the filters[], add it, do the formatting
      else {
        filters[forCell.cellIndex].push(event.target.innerText.toUpperCase());
        tgt.classList.add("selectedCustomChoice");
//         tgt.style.color = var(--dark-gray-color);
//         tgt.style.color = "rgba(204, 255, 153, 0.90)";
//         tgt.style.backgroundColor = "navy";

        // if one value is selected, display it in the filter field
        if (filters[forCell.cellIndex].length === 1) {
          forCell.children[0].value = event.target.innerText;
          addClearingBtn(forCell);
          sessionStorage.filters=JSON.stringify(filters);
        }
        // if more than one value is selected, add a comma and ellipsis
        else if (filters[forCell.cellIndex].length === 2) {
          forCell.children[0].value = "...";
          sessionStorage.filters=JSON.stringify(filters);
        }
        // if values are deleted, diplay that (emptyness)
        else if (filters[forCell.cellIndex].length === 0) {
          forCell.children[0].value = event.target.innerText;
          removeClearingBtn(forCell);
        }
      }
      filterData(); // todo: when reworking filters, here is the call to the needed function
    }

    // click on filter-clearing scissors
    else if (["filterRow", "filterCell"].includes(tgt.parentElement.className)
               &&  tgt.classList.contains("fa-cut")) {
      clearFilter(tgt);
    }

    // click on clear all filters button, upper scissors
    else if (tgt.id === "btnClearAllFilters") {
      // hide the scissors button
      tgt.display = "none";
      // scroll through the keys of the filters variable and clear each
      // going for table's first child(body) then second (filters row) then column(key)
      for (key in filters) {
        clearFilter(table.children[0].children[1].children[key].getElementsByClassName("btnRight")[0]);
      }
      filters = {};
    }

    // buttons for user to add a plant
    // click on 'clear text' button
    else if (tgt.id === "btnNewPlantClear") {
      hideNewPlantBtns(tgt.parentElement.parentElement);
      clearNewPlant();
    }
    // click on upload button
    else if (tgt.id === "btnNewPlantAdd") {
      hideNewPlantBtns(tgt.parentElement.parentElement);
      storeNewPlant();
    }
    // click on 'copy to modify' button
    else if (tgt.id === "btnNewPlantCopy") {
      if (tgt.parentElement.getElementsByClassName("dropUnqVals")[0]) {
        tgt.parentElement.removeChild(tgt.parentElement.getElementsByClassName("dropUnqVals")[0]);
      } else {
        getUnqVals(tgt.parentElement);
      }
    }
    // if one of the choices from existing plant menu (triggered above) is clicked
    else if (tgt.classList.contains("customChoice")
            && tgt.parentElement.parentElement.parentElement.id === "newPlantRow") {
      tgt.parentElement.parentElement.querySelector("#btnNewPlantClear").style.display = "block";
      copyRow(tgt);
    }

    // click on update of user added plant
    else if (tgt.classList.contains("btnUpdatePlant") && tgt.parentElement.parentElement.classList.contains("addedRows")) {
      saveEditedPlant(tgt.parentElement.parentElement);
    }
    // click on delete of user added plant
    else if (tgt.classList.contains("btnDeletePlant") && tgt.parentElement.parentElement.classList.contains("addedRows")) {
      removeAddedPlant(tgt.parentElement.parentElement);
    }

    // click on save changes button in Notes, Status, or Garden Location columns of existing plants
    else if (tgt.classList.contains("btnUpdatePlant")) {
      updateExistingPlant(tgt);
    }

    // if a picture is clicked, call the function to display the image gallery
    else if (tgt.className === "pic") {
      openGallery(tgt);
    }

    // if a picture gallery button is clicked
    else if (tgt.className === "btnImg" ||
             ["btnRight","btnLeft"].includes(tgt.className) &&
             tgt.parentElement.id === "picGal"
            ) {
      // if an image instead of a button is clicked
      if (tgt.className === "btnImg") {
        tgt = tgt.parentElement;
      }
      // if a next picture (right button) of picture gallery is clicked
      if(tgt.className === "btnRight") {
        pictureScroll("forward");
      }
      // if a previous picture (left button) of picture gallery is clicked
      else {
        pictureScroll("previous");
      }
    }

    // -- all other clicks -------------------------------------------------
    else {
      // clear view if a click is not on export/import or new plant's buttons
      if (!(["expImp", "btnInner"].map(i => {return tgt.classList.contains(i)}).reduce((a,b)=> a+b)
            && ["btnRight","btnLeft"].map(i => {return tgt.classList.contains(i)}).reduce((a,b)=> a+b)
            || tgt.classList.toString().includes("inputRange")
            || (tgt.children[0] && tgt.children[0].classList.toString().includes("inputRange")))) {
        cleanView();
      }
    }
    }
}

//////////////////////////////////////////////////////////////////////
function makeUneditable(tgt) {
  if(tgt.classList.contains("editableCol")) {
    tgt.contentEditable = "false";
  }
}

//////////////////////////////////////////////////////////////////////
// display the photo gallery
function openGallery(tgt) {
  cleanView();
  let picGallery = document.getElementById("picGal");
  picGallery.style.display = "block";
  picGallery.children[0].src = tgt.src;
  // capture the number of photos available in picture gallery picture from the source picture
  picGallery.children[0].attributes.value.value = tgt.attributes.value.value;
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
// this function is never called; it's here to manually check storage size for now
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
