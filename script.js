'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  // date = new Date();
  date;
  dateId;
  clicks = 0;

  constructor(coords, distance, duration, id) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min

    if (id) this.date = new Date(+id);
    else this.date = new Date();
    this.dateId = this.date.getTime() + '';
  }

  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, id = 0) {
    super(coords, distance, duration, id);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain, id = 0) {
    super(coords, distance, duration, id);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);

// console.log(+new Date());

// console.log(run1);
// console.log(cycling1);

/////////////////////////////////////////////
// APLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const sort = document.querySelector('.sort');
const btnSort = document.querySelector('.sort__btn');
const menuSort = document.querySelector('.sort__menu');

const sortDistance = document.querySelector('.sort__distance');
const sortDuration = document.querySelector('.sort__duration');
const sortSpeed = document.querySelector('.sort__speed');
const sortDefault = document.querySelector('.sort__default');
const deleteAll = document.querySelector('.delete-all');

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position
    this.#getPosition();

    // Get data from local storage
    this.#getLocalStroage();

    // Attach event handlers
    form.addEventListener('submit', this.#newWorkout.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
    sort.addEventListener('click', this.#toggleSortMenu);
    sortDistance.addEventListener('click', this.sortWorkouts.bind(this));
    sortDuration.addEventListener('click', this.sortWorkouts.bind(this));
    sortSpeed.addEventListener('click', this.sortWorkouts.bind(this));
    sortDefault.addEventListener('click', this.sortByDefault.bind(this));
    deleteAll.addEventListener('click', this.deleteAllWorkouts.bind(this));
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Could not get your positions');
        }
      );
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this.#showForm.bind(this));

    this.#workouts.forEach(work => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    console.log('h');
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this.#renderWorkoutMarker(workout);

    // Render workout on list
    this.#renderWorkoutForm(workout);

    // Hide form + clear input fields
    this.#hideForm();
    form.classList.add('hidden');

    // Set local storage to all workouts
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkoutForm(...workouts) {
    workouts.forEach(this.#renderEachWorkout.bind(this));
  }

  #renderEachWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.dateId}">
          <h2 class="workout__title">${workout.description}
            <div>
              <a href="" class="workout__edit">✏️ Edit</a>
              <a href="" class="workout__delete">❌ Delete</a>
            </div>
          </h2>

          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>            
      `;

    form.insertAdjacentHTML('afterend', html);

    document
      .querySelector('.workout__delete')
      .addEventListener('click', this.#deleteWorkout.bind(this));
    document
      .querySelector('.workout__edit')
      .addEventListener('click', this.#editWorkout.bind(this));
  }

  #moveToPopup(e) {
    if (
      e.target.classList.contains('workout__delete') ||
      e.target.classList.contains('workout__edit')
    )
      return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      workout => workout.dateId === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStroage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // this.#workouts = data;
    // this.#workouts.forEach(work => {
    data.forEach(work => {
      this.#restoreObject(work);
    });

    this.#renderWorkoutForm(...this.#workouts);
  }

  #restoreObject(workout) {
    if (workout.type === 'running')
      this.#workouts.push(
        new Running(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.cadence,
          workout.dateId
        )
      );

    if (workout.type === 'cycling')
      this.#workouts.push(
        new Cycling(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.elevationGain,
          workout.dateId
        )
      );

    // console.log(workout);
  }

  #deleteWorkout(e) {
    e.preventDefault();
    if (!e.target.classList.contains('workout__delete')) return;
    const found = this.#findWorkout(e.target);

    // Remove the workout element from the DOM
    const workoutElement = document.querySelector(
      `[data-id="${this.#workouts[found].dateId}"]`
    );
    if (workoutElement) workoutElement.remove();

    // Remove the workout from the array
    const deletedWorkout = this.#workouts.splice(found, 1)[0];

    // Remove the marker from the map
    this.#removeWorkoutMarker(deletedWorkout);

    // Update local storage
    this.#setLocalStorage();
  }

  #removeWorkoutMarker(workout) {
    // Assuming you have a map reference
    if (this.#map) {
      // Iterate through map layers and remove the marker with matching coordinates
      this.#map.eachLayer(layer => {
        if (
          layer instanceof L.Marker &&
          layer.getLatLng().equals(workout.coords)
        ) {
          this.#map.removeLayer(layer);
        }
      });
    }
  }

  #editWorkout(e) {
    e.preventDefault();
    if (!e.target.classList.contains('workout__edit')) return;
    const workoutElement = e.target.closest('.workout');

    // Extract values from the existing workout element
    const allValues = workoutElement.querySelectorAll('.workout__value');
    const distance = allValues[0].textContent;
    const duration = allValues[1].textContent;
    const cadence = allValues[3].textContent;
    const elevation = allValues[3].textContent;

    // Render the edit form with pre-filled values
    this.#renderEditForm(workoutElement, workoutElement.dataset.id, {
      distance,
      duration,
      cadence,
      elevation,
    });

    // workoutElement.classList.add('hidden');
  }

  #renderEditForm(
    workoutElement,
    workoutId,
    { distance, duration, cadence, elevation }
  ) {
    // Decide on how to distinguish running or cycling based on the existing workout element
    const workoutType = workoutElement.classList.contains('workout--running')
      ? 'running'
      : 'cycling';

    const html = `
      <form class="form form__edit">
        <div class="form__row">
          <label class="form__label">Type</label>
          <select class="form__input form__input--type" disabled>
            <option value="${workoutType}">${workoutType}</option>
          </select>
        </div>
        <div class="form__row">
          <label class="form__label">Distance</label>
          <input class="form__input form__input--distance" placeholder="km" value="${distance}" />
        </div>
        <div class="form__row">
          <label class="form__label">Duration</label>
          <input
            class="form__input form__input--duration"
            placeholder="min" value="${duration}"
          />
        </div>
        <div class="form__row ${
          workoutType === 'running' ? '' : 'form__row--hidden'
        }">
          <label class="form__label">Cadence</label>
          <input
            class="form__input form__input--cadence"
            placeholder="step/min" value="${cadence}"
          />
        </div>
        <div class="form__row ${
          workoutType === 'running' ? 'form__row--hidden' : ''
        }">
          <label class="form__label">Elev Gain</label>
          <input
            class="form__input form__input--elevation"
            placeholder="meters" value="${elevation}"
          />
        </div>
        <button class="form__btn">OK</button>
      </form>
    `;

    // Insert the edit form before the workout list
    // containerWorkouts.insertAdjacentHTML('afterbegin', html);
    const found = this.#findWorkout(workoutElement);

    workoutElement.closest('.workout').outerHTML = html;

    // Attach event listener for form submission
    const formEdit = document.querySelector('.form__edit');
    formEdit.addEventListener(
      'submit',
      this.#updateWorkout.bind({ this: this, found })
    );
  }

  #updateWorkout(e) {
    e.preventDefault();
    const workouts = this.this.#workouts;
    const found = this.found;
    const workout = workouts[found];

    // Extract values from the edit form
    const distance = +document.querySelector(
      '.form__edit .form__input--distance'
    ).value;
    const duration = +document.querySelector(
      '.form__edit .form__input--duration'
    ).value;
    const cadence = +document.querySelector('.form__edit .form__input--cadence')
      .value;
    const elevation = +document.querySelector(
      '.form__edit .form__input--elevation'
    ).value;

    // Create a new instance based on the workout type
    let newWorkout;
    if (workout.type === 'running') {
      newWorkout = new Running(
        workout.coords,
        distance,
        duration,
        cadence,
        workout.dateId
      );
    }

    if (workout.type === 'cycling') {
      newWorkout = new Cycling(
        workout.coords,
        distance,
        duration,
        elevation,
        workout.dateId
      );
    }

    // Replace the existing workout with the edited one
    workouts[found] = newWorkout;

    // Remove the existing workout element from the DOM
    const workoutElement = document.querySelector(
      `[data-id="${workout.dateId}"]`
    );
    if (workoutElement) workoutElement.remove();

    // Re-render the workouts on the map and in the list
    this.this.#renderWorkoutMarker(newWorkout);
    this.this.#renderWorkoutForm(newWorkout);

    // Update local storage
    this.this.#setLocalStorage();

    // Remove the edit form after updating
    const formEdit = document.querySelector('.form__edit');
    formEdit.remove();
  }

  #findWorkout(target) {
    const workoutId = target.closest('.workout').dataset.id;
    const found = this.#workouts.findIndex(work => work.dateId === workoutId);
    return found;
  }

  #toggleSortMenu() {
    menuSort.classList.toggle('active');
    btnSort.classList.toggle('active');
  }

  sortWorkouts(e) {
    const target = e.target;
    // Clearing list before rendering again
    document.querySelectorAll('.workout').forEach(work => work.remove());

    if (target.classList.contains('sort__distance')) this.sort('distance');
    if (target.classList.contains('sort__duration')) this.sort('duration');
    if (target.classList.contains('sort__speed')) this.sortBySpeed();
  }

  sort(group) {
    let sortedArray = this.#workouts
      .slice()
      .sort((a, b) => a[`${group}`] - b[`${group}`]);
    this.#renderWorkoutForm(...sortedArray);
  }

  sortBySpeed() {
    let sortedArray = this.#workouts.slice().sort((a, b) => {
      // Runnings have pace, Cyclings have speed. We need to distinguish them.
      let first, second;
      if (a.type === 'running') first = a.pace;
      else first = a.speed;
      if (b.type === 'cycling') second = b.speed;
      else second = b.pace;

      return first - second;
    });
    this.#renderWorkoutForm(...sortedArray);
  }

  sortByDefault() {
    document.querySelectorAll('.workout').forEach(work => work.remove());
    this.sort('date');
  }

  deleteAllWorkouts() {
    document.querySelectorAll('.workout').forEach(work => work.remove());
    this.#workouts = [];
    this.#setLocalStorage();
    this.#renderWorkoutForm(...this.#workouts);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// document.querySelector('.menu').addEventListener('click', function () {
//   this.classList.toggle('open');
//   console.log('h');
// });
