import Meact from "./Meact";
import "./App.css";

/** @jsx Meact.createElement */

const user = {
  firstName: "John",
  lastName: "Doe",
  image: "avatar.jpeg",
  title: "Cool dude",
};

function App() {
  return (
    <main className="cards">
      <div className="card card--expanded">
        <h2 className="card-title">
          {user.firstName} {user.lastName}
        </h2>
        <div className="card-body">
          <div>
            <h3 style={{ backgroundColor: "hotpink" }}>
              {user.lastName}; {user.firstName}
            </h3>
            <img src="avatar.jpg" alt="" width="200" className="profile" />
            <input disabled={false} required value="Hello there" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
