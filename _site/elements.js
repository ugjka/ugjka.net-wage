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
    #total, .history {
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
    <button id="new" @click="this.newDay()">Jauna Diena ({{this.days}})</button>
    <slot></slot>
    <div id="total">Kopā nopelnīts: {{this.total}}€</div>
    <div id="footer">
      <button @click="this.nukeAll()">Dzēst visu</button>
      <button @click="this.lock()">{{this.locked ? "Atslēgt" : "Slēgt"}}</button>
    </div>
    <div class="history" *foreach={{this.history}}>
      {{item}}
    </div>
    <div class="history">Kopā pavisam: {{this.historyTotalCur}}€</div>
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
      this.days = counters.length
      document.addEventListener("calculate", () => { this.updateTotal(); });
      counters.forEach((v) => {
        let el = document.createElement("tank-counter");
        el.setAttribute("date", v[0]);
        el.setAttribute("count", v[1]);
        this.append(el);
      });
      let history = localStorage.getObject("wagehist");
      if (!history) {
        this.history = [];
      } else {
        this.history = history;
      }
      let historyTotal = localStorage.getObject("wagetotal");
      if (!historyTotal) {
        this.historyTotal = 0;
      } else {
        this.historyTotal = historyTotal;
        this.historyTotalCur = historyTotal;
      }
      this.updateTotal();
    }

    lock() {
      if (this.locked) {
        document.dispatchEvent(unlockEvent);
        this.locked = false;
      } else {
        document.dispatchEvent(lockEvent);
        this.locked = true;
      }
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }

    updateTotal() {
      this.days = counters.length
      let sum = 0;
      counters.forEach((v) => { sum += v[1] });
      let money = sum * 3.5;
      this.total = `${sum} x 3.50€ = ${money}`;
      this.historyTotalCur = this.historyTotal + money;
    }

    newDay() {
      this.days++
      let today = `${new Date().toISOString().slice(5, 10)} ${getDayOfWeek()}`;
      counters = [[today, 0], ...counters];
      document.dispatchEvent(saveDataEvent);
      let el = document.createElement("tank-counter");
      el.setAttribute("date", today);
      el.setAttribute("count", "0");
      this.prepend(el);
      if (this.locked) {
        document.dispatchEvent(disableButtonsEvent);
      }
    }

    addHistory() {
      let today = `${new Date().toISOString().slice(0, 10)}`
      let sum = 0;
      counters.forEach((v) => { sum += v[1] });
      let money = sum * 3.5;
      let newhist = `${today}: ${sum} x 3.50€ = ${money}€`;
      let history = localStorage.getObject("wagehist");
      if (!history) {
        history = [];
      }
      history = [newhist, ...history];
      localStorage.setObject("wagehist", history);
      this.history = history;
      this.historyTotal += money;
      localStorage.setObject("wagetotal", this.historyTotal);
    }

    nukeAll() {
      if (confirm("Vai tiešām dzēst visu?")) {
        for (let i = counters.length - 1; i >= 0; i--) {
          this.children[i].remove();
        }
        this.addHistory();
        this.days = 0;
        counters = [];
        document.dispatchEvent(saveDataEvent);
      }
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
      .date {
        flex-basis: 45%;
      }
    </style>
    <div>   
      <button @click="this.nuke()">X</button>
      <span class="date">{{this.date}}</span>
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

    disableListener = e => {
      if (this.locked) {
        this.disableButton();
      }
    }

    lockListener = e => {
      if (e.detail) {
        this.locked = true
        this.disableButton();
      } else {
        this.unlock();
        this.locked = false;
      }
    }

    onCreated() {
      this.date = this.getAttribute("date");
      this.count = this.getAttribute("count");
      document.addEventListener("disable", this.disableListener);
      document.addEventListener("lock", this.lockListener);
    }

    onRemoved() {
      document.removeEventListener("disable", this.disableListener);
      document.removeEventListener("lock", this.lockListener);
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
        if (this.locked) {
          document.dispatchEvent(disableButtonsEvent);
        }
      }
    }

    id() {
      return [...this.parentNode.children].indexOf(this);
    }
  }
);