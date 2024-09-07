// Remplace par ton propre Mapbox Access Token
mapboxgl.accessToken =
  "pk.eyJ1IjoicnVudHJhY2siLCJhIjoiY20wcDYyOWp2MDF1djJxczZhN2g4cXQ5cSJ9.Ek_jXOnyFS9uDJJxGnhU5Q";

// Initialiser la carte avec un style par défaut
let map = new mapboxgl.Map({
  container: "map", // Id de l'élément HTML qui contiendra la carte
  style: "mapbox://styles/runtrack/cm0r2wr2b00mx01pm2jcp75lj", // Style initial Noir & Blanc
  center: [2.3488, 48.8534], // Coordonnées de Paris
  zoom: 12, // Niveau de zoom initial
});

// Variables pour stocker la source et la couche GPX
let gpxSource = null;
let gpxLayer = null;

// Fonction pour changer le style de la carte
function changeMapStyle(styleUrl) {
  map.setStyle(styleUrl);
  map.on("style.load", function () {
    map.getStyle().layers.forEach(function (layer) {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        layer.layout["text-field"]
      ) {
        map.removeLayer(layer.id); // Enlever les couches avec du texte
      }
    });
    if (gpxSource && gpxLayer) {
      map.addSource("gpxSource", gpxSource);
      map.addLayer(gpxLayer);
    }
  });
}

// Gestion du changement de style via la liste déroulante
document
  .getElementById("style-select")
  .addEventListener("change", function (event) {
    const selectedStyle = event.target.value; // Récupérer l'URL du style sélectionné
    changeMapStyle(selectedStyle); // Changer le style de la carte
  });

// Fonction pour ajouter un cercle au point de départ et un carré à l'arrivée du tracé GPX
function addStartEndMarkers(geojson) {
  const coordinates = geojson.features[0].geometry.coordinates;

  // Cercle au point de départ
  map.addLayer({
    id: "start-point",
    type: "circle",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinates[0],
        },
      },
    },
    paint: {
      "circle-radius": 4,
      "circle-color": "#FFFFFF",
    },
  });

  // Carré au point d'arrivée
  map.addLayer({
    id: "end-point",
    type: "symbol",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinates[coordinates.length - 1],
        },
      },
    },
    layout: {
      "icon-image": "square",
      "icon-size": 4,
    },
  });
}

// Fonction pour charger et afficher le fichier GPX avec une couleur personnalisée
function loadGPXFromFile(file, color) {
  const reader = new FileReader();

  // Une fois que le fichier est lu
  reader.onload = function (event) {
    const gpxData = event.target.result;

    // Parser le fichier GPX en XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, "application/xml");

    // Convertir le GPX en GeoJSON
    const geojson = toGeoJSON.gpx(xmlDoc);

    // Si la source GPX existe déjà, mettre à jour ses données et sa couleur
    if (gpxSource) {
      gpxSource.data = geojson;
      gpxLayer.paint["line-color"] = color;
      map.getSource("gpxSource").setData(geojson);
    } else {
      gpxSource = {
        type: "geojson",
        data: geojson,
      };
      gpxLayer = {
        id: "gpxLayer",
        type: "line",
        source: "gpxSource",
        layout: {},
        paint: {
          "line-color": color, // Couleur du tracé GPX
          "line-width": 5, // Épaisseur légèrement supérieure du tracé GPX
        },
      };
      map.addSource("gpxSource", gpxSource);
      map.addLayer(gpxLayer);
    }

    // Ajouter les marqueurs de début et fin
    addStartEndMarkers(geojson);
  };

  // Lire le fichier en tant que texte
  reader.readAsText(file);
}

// Gestion du bouton de chargement
document.getElementById("upload-button").addEventListener("click", function () {
  const fileInput = document.getElementById("file-input");
  const colorPicker = document.getElementById("color-picker");

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const selectedColor = colorPicker.value; // Récupérer la couleur sélectionnée
    loadGPXFromFile(file, selectedColor); // Charger le GPX avec la couleur choisie
  } else {
    alert("Veuillez sélectionner un fichier GPX à charger.");
  }
});

// Gestion des modifications en temps réel du tracé GPX (couleur uniquement)
document.getElementById("color-picker").addEventListener("input", function () {
  if (gpxLayer) {
    const newColor = this.value;
    gpxLayer.paint["line-color"] = newColor;
    map.setPaintProperty("gpxLayer", "line-color", newColor);
  }
});

// Fonction pour ajouter une nouvelle zone de texte
document
  .getElementById("add-text-button")
  .addEventListener("click", function () {
    const textContainer = document.getElementById("text-container");
    const newText = document.createElement("div");
    newText.className = "text-box";
    newText.contentEditable = true;
    newText.innerHTML = "Double-cliquez ici pour éditer le texte.";
    newText.style.left = "100px"; // Position par défaut
    newText.style.top = "50px"; // Position par défaut

    textContainer.appendChild(newText);

    // Rendre la nouvelle zone de texte déplaçable et redimensionnable
    makeTextBoxInteractive(newText);
  });

// Fonction pour rendre une zone de texte interactive
function makeTextBoxInteractive(textBox) {
  interact(textBox)
    .draggable({
      onmove: dragMoveListener,
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
    })
    .on("resizemove", function (event) {
      let target = event.target;
      let x = parseFloat(target.getAttribute("data-x")) || 0;
      let y = parseFloat(target.getAttribute("data-y")) || 0;

      target.style.width = event.rect.width + "px";
      target.style.height = event.rect.height + "px";

      x += event.deltaRect.left;
      y += event.deltaRect.top;

      target.style.transform = "translate(" + x + "px, " + y + "px)";

      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);
    });
}

// Fonction de déplacement du texte
function dragMoveListener(event) {
  let target = event.target;
  let x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
  let y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  target.style.transform = "translate(" + x + "px, " + y + "px)";

  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);
}

// Gestion de la personnalisation des zones de texte (indépendant pour chaque zone)
let selectedTextBox = null;

document
  .getElementById("text-container")
  .addEventListener("click", function (event) {
    if (event.target.classList.contains("text-box")) {
      selectedTextBox = event.target; // Sélectionner la zone de texte sur laquelle l'utilisateur clique
      updateTextControls();
    }
  });

function updateTextControls() {
  if (selectedTextBox) {
    document.getElementById("font-select").value =
      selectedTextBox.style.fontFamily || "Arial";
    document.getElementById("font-size").value =
      parseInt(selectedTextBox.style.fontSize) || 24;
    document.getElementById("font-color").value =
      selectedTextBox.style.color || "#000000";
    document.getElementById("text-align").value =
      selectedTextBox.style.textAlign || "left";
  }
}

document.getElementById("font-select").addEventListener("change", function () {
  if (selectedTextBox) {
    selectedTextBox.style.fontFamily = this.value;
  }
});

document.getElementById("font-size").addEventListener("input", function () {
  if (selectedTextBox) {
    selectedTextBox.style.fontSize = this.value + "px";
  }
});

document.getElementById("font-color").addEventListener("input", function () {
  if (selectedTextBox) {
    selectedTextBox.style.color = this.value;
  }
});

document.getElementById("text-align").addEventListener("change", function () {
  if (selectedTextBox) {
    selectedTextBox.style.textAlign = this.value;
  }
});

// Fonction pour télécharger la carte et les textes en PNG
document
  .getElementById("download-png-button")
  .addEventListener("click", function () {
    html2canvas(document.querySelector("#map")).then((canvas) => {
      let link = document.createElement("a");
      link.download = "carte.png";
      link.href = canvas.toDataURL("image/png"); // Type PNG
      link.click(); // Simuler un clic pour télécharger
    });
  });

// Fonction pour télécharger la carte et les textes en PDF
document
  .getElementById("download-pdf-button")
  .addEventListener("click", function () {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [475, 671], // Dimensions du format réduit en pixels
    });

    html2canvas(document.querySelector("#map")).then((canvas) => {
      let imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 0, 0);
      doc.save("carte.pdf");
    });
  });
