"use strict";

/* ################
	Config
#################*/
const CONFIG = {
	version: "1.1.1",
	documentTitle: "Beschilderungssatz",
	author: "Christian",
	keywords: "Beschilderung, Beschilderungssatz",
	creator: "Schildergenerator",
	indexTitle: "Alphabetischer Index",
	tocTitle: "Übersicht",
	filename: "beschilderung",
	filetype: ".pdf"
};

// Predefined categories (no whitespace, lower case only)
const CATEGORIES = {
	betreuung: {r: 136, g: 80, b: 43}, // brown
	führung: {r: 255, g: 207, b: 51}, // yellow
	hygiene: {r: 0, g: 138, b: 230}, // blue 
	sanitätsdienst: {r: 239, g: 65, b: 41}, // red
	sonstiges: {r: 142, g: 137, b: 134}, // grey				
	technikundsicherheit: {r: 0, g: 0, b: 0}, // black
	verpflegung: {r: 21, g: 157, b: 21} // green 
};

const TEXT = {
	page: "Seite",
	generationStarted: "Der Schildersatz wird generiert. Dies kann einen Moment dauern.",
	errorLargeFile: "Die PDF-Datei ist zu groß, um in der Vorschau angezeigt zu werden. Sie wird in Kürze zum Download verfügbar sein.",
	errorNoCSV: "Fehler: Die ausgewählte Datei konnte nicht als CSV-Datei erkannt werden. Bitte wählen Sie eine CSV-Datei aus.",
	errorNoColor: "Fehler: Es wurde keine Farbe für die folgende Kategorie definiert: "
};

let doc; // global variable for the PDF document
let images = {}; // global object for storing all images
let iframe = document.getElementById("preview"); // iframe for PDF preview

/* ################
	Document 
#################*/
let createDocument = (results) => {
	clearWebsite();
	
	let data = results.data;
	// sort all rows (original array is sorted in place)
	data.sort(compareByMultipleAttributes);

	doc = new jsPDF("landscape", "mm", "a4");
	doc.setProperties({
		title: CONFIG.documentTitle,
		subject: CONFIG.documentTitle,
		author: CONFIG.author,
		keywords: CONFIG.keywords,
		creator: CONFIG.creator + " " + CONFIG.version
	});
	doc.deletePage(1); // delete first page as this is always blank	
	createAllSigns(data);
	doc.addCoverPage(CONFIG.tocTitle, CONFIG.documentTitle);
	createTableOfContents(data, CONFIG.documentTitle);
	createTableOfContentsForAllCategories(data);
	doc.addCoverPage(CONFIG.indexTitle, CONFIG.documentTitle);
	createAlphabeticalIndex(data); // must be called last due to changed order
			
	let numberOfImages = Object.keys(images).length;
	let numberOfGeneratedPages = doc.internal.getNumberOfPages();
	if(numberOfImages > 25 || numberOfGeneratedPages > 150) {
		showErrorForPreview();
		doc.save(CONFIG.filename + CONFIG.filetype); // download file automatically
	}
	else {
		iframe.src = doc.output("datauristring"); // display pdf in iframe
	}
};

let createAllSigns = (rows) => {	
	for(let row of rows) {
		if(row.Englisch == null) {
			row.Englisch = "";
		}
		let hasText = true;
		if(row.TextAnzeigen === "nein") {
			hasText = false;
		}
		for(let i = 0; i < row.Anzahl; i++) {
			let circleColor = getCircleColorForCategory(row.Kategorie);			
			doc.addSign(row.Deutsch, row.Englisch, hasText, images[row.Bild], true, circleColor);
		}
	}
};

let createTableOfContentsForAllCategories = (rows) => {
	let rowsGroupedByCategory = groupBy(rows, "Kategorie");
	for (let key in rowsGroupedByCategory) {
		if(key && key != "undefined" && key != "") {
			doc.addCoverPage(key, CONFIG.documentTitle);
			createTableOfContentsForCategory(rowsGroupedByCategory[key], key);
		}
	}
};

let createTableOfContents = (rows, pageTitle) => {
	let columnTitles = ["Kategorie", "Unterkategorie", "Deutsch", "Englisch", "Anzahl"];
	let newArray = [];
	for(let row of rows){
		newArray.push([row.Kategorie, row.Unterkategorie, row.Deutsch, row.Englisch, row.Anzahl])
	}
	let title = CONFIG.tocTitle + " - " + pageTitle;
	doc.addIndexTable(columnTitles, newArray, title, true);
};

let createTableOfContentsForCategory = (rows, pageTitle) => {
	let columnTitles = ["Unterkategorie", "Deutsch", "Englisch", "Anzahl"];
	let newArray = [];
	for(let row of rows) {
		newArray.push([row.Unterkategorie, row.Deutsch, row.Englisch, row.Anzahl])
	}
	let title = CONFIG.tocTitle + " - " + pageTitle;
	let circleColor = getCircleColorForCategory(pageTitle);			
	doc.addIndexTable(columnTitles, newArray, title, true, circleColor);
};

let createAlphabeticalIndex = (rows) => {
	let columnTitles = ["Deutsch", "Kategorie", "Unterkategorie", "Anzahl"];
	let dataSorted = rows.sort(compareByGermanTitle);
	let newArray = [];
	for(let row of dataSorted) {
		newArray.push([row.Deutsch, row.Kategorie, row.Unterkategorie, row.Anzahl])		
	}
	doc.addIndexTable(columnTitles, newArray, CONFIG.indexTitle, false);
};

/* ################
	Utils
#################*/
let compareByGermanTitle = (a,b) => {
	if (a.Deutsch < b.Deutsch)
		return -1;
	if (a.Deutsch > b.Deutsch)
		return 1;
	return 0;
};

// Sort by attributes in the following order 1. Kategorie, 2. Unterkategorie, 3. Deutsch
let compareByMultipleAttributes = (a,b) => {
	if (a.Kategorie < b.Kategorie)
		return -1;
	if (a.Kategorie > b.Kategorie)
		return 1;
	if (a.Unterkategorie < b.Unterkategorie)
		return -1;
	if (a.Unterkategorie > b.Unterkategorie)
		return 1;
	if (a.Deutsch < b.Deutsch)
		return -1;
	if (a.Deutsch > b.Deutsch)
		return 1;		
	return 0;	
};

// Create an array of subarrays grouped by property
let groupBy = (arr, property) => {
	return arr.reduce(function(memo, x) {
		if (!memo[x[property]]) {
			memo[x[property]] = [];
		}
		memo[x[property]].push(x);
		return memo;
	}, {});
};

let getCircleColorForCategory = (category) => {
	category = category.replace(/\s/g,"");
	category = category.toLowerCase();

	let circleColor = CATEGORIES[category]; 
	if(circleColor == null) {
		circleColor = {r: 255, g: 255, b: 255};
		showMessage(TEXT.errorNoColor + category);
	}
	return circleColor;
};

/* ################
	App
#################*/
let showMessage = (msg) => {
	document.getElementById("feedback").innerHTML = msg;
};

let clearWebsite = () => {
	document.getElementById("feedback").innerHTML = "";
};

let showExamplePDF = () => {
	doc = new jsPDF("landscape", "mm", "a4");
	doc.deletePage(1); // delete first page as this is always blank
	doc.addSign("Beispieltext", "example text", true, null, true, CATEGORIES.verpflegung);
	doc.addSign("Beispieltext", "example text", true, null, true, CATEGORIES.verpflegung);

	iframe.src = doc.output("datauristring");
};

let showErrorForPreview = () => {
	let oldElement = document.getElementById("preview");	
	let newElement = document.createElement("div");
	newElement.id ="preview";
	newElement.innerHTML = "<p>" + TEXT.errorLargeFile + "</p>";

	document.body.removeChild(oldElement);
	document.body.appendChild(newElement);
};

let readImageFile = (fileToLoad) => {
	let fileReader = new FileReader();
	fileReader.onload = (fileLoadedEvent) => {
		let base64SourceData = fileLoadedEvent.target.result;
		images[fileToLoad.name] = {"name": fileToLoad.name, "type": fileToLoad.type, "imageData": base64SourceData}; // push to gobal array	
	};
	fileReader.readAsDataURL(fileToLoad);
};

let handleFileReadingError = (err, file, inputElem, reason) => {
	showMessage(err + " " + reason);
};

let provideExampleCSVfile = () => {
	let exampleText = "Deutsch	Englisch	Anzahl	TextAnzeigen	Kategorie	Unterkategorie	Bild\nDuschen Frauen	Showers women	3	ja	Hygiene	Bereiche	dusche_frauen.png\nPfeil (gerade)		3	nein	Betreuung	Pfeile	arrow.png";
	let element = document.getElementById("exampleFile");
	element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(exampleText));
	element.setAttribute("download", "example.csv");
};

// Set up page on page load
document.getElementById("version").innerHTML = CONFIG.version;
clearWebsite();
showExamplePDF();
provideExampleCSVfile();

// Handle CSV upload
let fileInput = document.getElementById("fileupload");
fileInput.onchange = (event) => {
	let file = fileInput.files[0];
	
	if(file.type === "text/csv") {
		showMessage(TEXT.generationStarted);
		Papa.parse(file, {
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true,
			complete: createDocument,
			error: handleFileReadingError
		});	
	}
	else {
		showMessage(TEXT.errorNoCSV);	
	}
};

// Handle image upload
let imagesUpload = document.getElementById("imagesUpload");
imagesUpload.onchange = (event) => {
	let files = imagesUpload.files;
	for(let i = 0; i < imagesUpload.files.length;i++) {
		readImageFile(imagesUpload.files[i]);
	}
};

let helpLink = document.getElementById("help-link");
helpLink.onclick = (event) => {
	document.getElementById("help").style.display = "block";
};

let helpClose = document.getElementById("help-close");
helpClose.onclick = (event) => {
	document.getElementById("help").style.display = "none";
};

