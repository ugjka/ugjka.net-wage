import "./slim-js/index.js";
import "./slim-js/directives/all.js";

Storage.prototype.setObject = function (key, value) {
  this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function (key) {
  var value = this.getItem(key);
  return value && JSON.parse(value);
}

const saveDataEvent = new Event('save');
const calculateTotalEvent = new Event('calculate');
const disableButtonsEvent = new Event('disable');
const lockEvent = new CustomEvent('lock', { detail: true });
const unlockEvent = new CustomEvent('lock', { detail: false });

document.addEventListener('save', () => {
  localStorage.setObject("wage", counters);
  document.dispatchEvent(calculateTotalEvent);
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
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
    #footer {
      display: flex;
      justify-content: space-between;
    }
  </style>
  <div>
    <button id="new" @click="this.newDay()">Jauna Diena</button>
    <slot></slot>
    <div id="total">Kopā nopelnīts: {{this.total}}€</div>
    <div id="footer">
      <button @click="this.nukeAll()">Dzēst visu</button>
      <button @click="this.lock()">{{this.locked ? "Atslēgt" : "Slēgt"}}</button>
    </div>
  </div>
  `,
  class CounterControl extends Slim {
    constructor() {
      super();
      this.total = 0;
      this.locked = true;
    }

    onCreated() {
      counters = localStorage.getObject("wage");
      if (!counters) {
        counters = [];
      }
      document.addEventListener("calculate", () => { this.updateTotal(); });
      this.updateTotal();
      counters.forEach((v) => {
        let el = document.createElement("tank-counter");
        el.setAttribute("date", v[0]);
        el.setAttribute("count", v[1]);
        this.append(el);
      });
    }

    lock() {
      if(this.locked){
        document.dispatchEvent(unlockEvent);
        this.locked = false;
      } else{
        document.dispatchEvent(lockEvent);
        this.locked = true;
      }
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }

    updateTotal() {
      let sum = 0;
      counters.forEach((v) => { sum += v[1] });
      let money = sum * 3.5;
      this.total = `${sum} x 3.50€ = ${money}`;
    }

    newDay() {
      let today = `${new Date().toISOString().slice(5, 10)} ${getDayOfWeek()}`;
      counters = [[today, 0], ...counters];
      document.dispatchEvent(saveDataEvent);
      let el = document.createElement("tank-counter");
      el.setAttribute("date", today);
      el.setAttribute("count", "0");
      this.prepend(el);
      if (this.locked){
        document.dispatchEvent(disableButtonsEvent);
      }
    }

    nukeAll() {
      if (confirm("Vai tiešām dzēst visu?")) {
        for (let i = counters.length - 1; i >= 0; i--) {
          this.children[i].remove();
        }
      }
      counters = [];
      document.dispatchEvent(saveDataEvent);
    }
  }
)

Slim.element(
  'tank-counter',
  `
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
    <div>   
      <button @click="this.nuke()">X</button>
      <span>{{this.date}}</span>
      <button #ref="minus" @click="this.sub()"> - </button>
      <span>{{this.count}}</span>
      <button #ref="plus" @click="this.add()"> + </button>
    </div>
    `,
  class TankCounter extends Slim {
    constructor() {
      super();
      this.locked = true;
    }

    onCreated() {
      this.date = this.getAttribute("date");
      this.count = this.getAttribute("count");
      document.addEventListener("disable", () => {
        if (this.locked) {
          this.disableButton();
        }
      });
      document.addEventListener("lock", (e) => {
        if (e.detail){
          this.locked = true
          this.disableButton();
        } else{
          this.unlock();
          this.locked = false;
        }
      });
    }

    unlock() {
      this.plus.removeAttribute("disabled");
      this.minus.removeAttribute("disabled");
    }

    disableButton() {
      if (this.id() > 0) {
        this.plus.setAttribute("disabled", "");
        this.minus.setAttribute("disabled", "");
      } else {
        this.plus.removeAttribute("disabled");
        this.minus.removeAttribute("disabled");
      }
    }

    onRender() {
      this.disableButton();
    }

    add() {
      this.count++;
      updateCounter(this.id(), this.count);
      document.dispatchEvent(saveDataEvent);
    }

    sub() {
      this.count--;
      updateCounter(this.id(), this.count);
      document.dispatchEvent(saveDataEvent);
    }

    nuke() {
      if (confirm("Vai tiešām dzēst?")) {
        deleteCounter(this.id());
        this.remove();
        document.dispatchEvent(saveDataEvent);
        if (this.locked){
          document.dispatchEvent(disableButtonsEvent);
        }
      }
    }

    id() {
      if (this.parentNode == null){
        return 0;
      }
      return [...this.parentNode.children].indexOf(this);
    }
  }
);