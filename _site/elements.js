import "./slim-js/index.js";
import "./slim-js/directives/all.js";

Storage.prototype.setObject = function (key, value) {
  this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function (key) {
  var value = this.getItem(key);
  return value && JSON.parse(value);
}

const saveEvent = new Event('save');
const totalEvent = new Event('update');

document.addEventListener('save', () => {
  localStorage.setObject("wage", counters);
  document.dispatchEvent(totalEvent);
});

var counters = [];

function deleteCounter(id) {
  counters.splice(id, 1);
}

function updateCounter(id, value) {
  counters[id][1] = value;
}

function getDayOfWeek() {
  let days = [
    "Svētdiena",
    "Pirmdiena",
    "Otrdiena",
    "Trešdiena",
    "Ceturtdiena",
    "Piektdiena",
    "Sestdiena",
  ];
  let d = new Date();
  let n = d.getDay();
  return days[n];
};

Slim.element(
  'counter-control',
  `
  <button id="new" @click="this.newDay()">Jauna Diena</button>
  <tank-counter *foreach={{this.data}} date={{item[0]}} count={{item[1]}}></tank-counter>
  <div id="total">Kopā nopelnīts: {{this.total}}€</div>
  <style>
    button {
      height: 35px;
      margin: 15px;
    }
    #total {
      background: white;
      border-style: solid;
      border-width: 1px;
      padding: 10px;
      margin: 10px;
    }
  </style>
  `,
  class CounterControl extends Slim {
    constructor() {
      super();
      this.total = 0;
    }
    static get useShadow() {
      return false;
    }
    onCreated() {
      let stor = localStorage.getObject("wage");
      if (stor) {
        counters = stor;
        this.data = counters;
      }
      document.addEventListener("update", () => { this.updateTotal(); });
      this.updateTotal();
    }
    updateTotal() {
      let counter = 0;
      counters.forEach((v) => { counter += v[1] });
      let money = counter * 3.5;
      this.total = counter + " x 3.50€ = " + money;
    }
    newDay() {
      let today = new Date().toISOString().slice(5, 10) + " " + getDayOfWeek();
      counters = [[today, 0], ...counters];
      document.dispatchEvent(saveEvent);
      let el = document.createElement("tank-counter");
      el.setAttribute("date", today);
      el.setAttribute("count", "0");
      let but = document.getElementById("new");
      but.parentNode.insertBefore(el, but.nextSibling);
    }
  }
)

Slim.element(
  'tank-counter',
  `<div>   
      <button @click="this.nuke()">X</button>
      <span>{{this.date}}</span>
      <button @click="this.sub()"> - </button>
      <span>{{this.count}}</span>
      <button @click="this.add()"> + </button>
    </div>
    <style>
      div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 50px;
        border-style: solid;
        border-width: 1px;
        padding: 10px;
        margin: 10px;
        background: white;
      }
      button {
        width: 40px;
        height: 40px;
      }
    </style>
    `,
  class TankCounter extends Slim {
    constructor() {
      super();
    }
    onCreated() {
      this.date = this.getAttribute("date");
      this.count = this.getAttribute("count");
    }

    add() {
      this.count++;
      updateCounter(this.id(), this.count);
      document.dispatchEvent(saveEvent);
    }
    sub() {
      this.count--;
      updateCounter(this.id(), this.count);
      document.dispatchEvent(saveEvent);
    }
    nuke() {
      if (confirm("Vai tiešām dzēst?")) {
        deleteCounter(this.id());
        this.remove();
        document.dispatchEvent(saveEvent);
      }
    }
    id() {
      return [...this.parentNode.children].indexOf(this) - 1;
    }
  }
);