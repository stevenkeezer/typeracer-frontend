import React from "react";

import Clock from "./components/Clock";
import Footer from "./components/Footer";
import TextInput from "./components/TextInput";
import TextDisplay from "./components/TextDisplay";
import { isDeclaredPredicate } from "@babel/types";

require("./sass/app.scss");
require("./font-awesome/css/font-awesome.css");

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      wpm: 0,
      index: 0,
      value: "",
      token: "22",
      error: false,
      errorCount: 0,
      excerpts: [],
      topScore: 0,
      timeElapsed: 0,
      lineView: false,
      startTime: null,
      totalScores: 0,
      scoreIndex: 0,
      completed: false,
      excerpt: { body: "" },
      high_scores: []
    };
  }

  async componentDidMount() {
    this.intervals = [];
    this.getExcerpts();
    this.getTopScores();
    // this.setupCurrentUser();
  }

  getExcerpts = async () => {
    const response = await fetch("https://localhost:5000/excerpts");
    const data = await response.json();
    this.setState({
      excerpts: data,
      excerpt: this._randomElement(data)
    });
  };

  getTopScores = async () => {
    const response = await fetch("https://localhost:5000/topscores");
    const data = await response.json();
    this.setState({
      scoreIndex: data[2],
      totalScores: data[1],
      topScore: this._randomElement(data[0]),
      high_scores: data[3]
    });
  };

  setupCurrentUser = () => {
    const existingToken = sessionStorage.getItem("token");
    const accessToken =
      window.location.search.split("=")[0] === "?api_key"
        ? window.location.search.split("=")[1]
        : null;
    if (!accessToken && !existingToken) {
      window.location.replace(`https://127.0.0.1:5000`);
    }

    if (accessToken) {
      sessionStorage.setItem("token", accessToken);
    }
    this.setState({
      token: existingToken || accessToken
    });
  };

  setInterval() {
    this.intervals.push(setInterval.apply(null, arguments));
  }

  _randomElement = array => {
    return array[Math.floor(Math.random() * array.length)];
  };

  _handleInputChange = e => {
    if (this.state.completed) return;

    let inputVal = e.target.value;
    let index = this.state.index;
    if (
      this.state.excerpt.body.slice(index, index + inputVal.length) === inputVal
    ) {
      if (inputVal.slice(-1) === " " && !this.state.error) {
        this.setState({
          value: "",
          index: this.state.index + inputVal.length
        });
      } else if (index + inputVal.length === this.state.excerpt.body.length) {
        this.setState(
          {
            value: "",
            completed: true
          },
          this._calculateWPM
        );

        this.intervals.map(clearInterval);
      } else {
        this.setState({
          error: false,
          value: inputVal
        });
      }
    } else {
      this.setState({
        error: true,
        value: inputVal,
        errorCount: this.state.error
          ? this.state.errorCount
          : this.state.errorCount + 1
      });
    }
  };

  _changeView = e => {
    this.setState({ lineView: !this.state.lineView });
  };

  _restartGame = () => {
    this.setState(
      {
        wpm: 0,
        index: 0,
        value: "",
        error: false,
        errorCount: 0,
        timeElapsed: 0,
        lineView: false,
        startTime: null,
        completed: false,
        excerpt: this._randomElement(this.state.excerpts)
      },
      () => this.intervals.map(clearInterval)
    );
  };

  _setupIntervals = () => {
    this.setState(
      {
        startTime: new Date().getTime()
      },
      () => {
        this.setInterval(() => {
          this.setState({
            timeElapsed: new Date().getTime() - this.state.startTime
          });
        }, 50);
        this.setInterval(this._calculateWPM, 1000);
      }
    );
  };

  postScore = async (wpm, elapsed) => {
    const resp = await fetch("https://127.0.0.1:5000/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.state.token}`
      },
      body: JSON.stringify({
        wpm,
        time: elapsed,
        current_excerpt: this.state.excerpt,
        excerpt_id: this.state.excerpt.id,
        errorCount: this.state.errorCount
      })
    });
    const data = await resp.json();
    if (data.code === 200) {
    } else {
      this.setState({ error: "Could not post score" });
    }
  };

  _calculateWPM = () => {
    const elapsed = new Date().getTime() - this.state.startTime;
    let wpm;
    if (this.state.completed) {
      wpm = (this.state.excerpt.body.split(" ").length / (elapsed / 1000)) * 60;
      this.postScore(wpm, elapsed);
    } else {
      let words = this.state.excerpt.body.slice(0, this.state.index).split(" ")
        .length;
      wpm = (words / (elapsed / 1000)) * 60;
    }
    this.setState({
      wpm: this.state.completed ? Math.round(wpm * 10) / 10 : Math.round(wpm)
    });
  };

  renderGame = () => {
    return (
      <>
        <TextDisplay
          index={this.state.index}
          error={this.state.error}
          lineView={this.state.lineView}
        >
          {this.state.excerpt.body}
        </TextDisplay>
        <TextInput
          error={this.state.error}
          value={this.state.value}
          started={!!this.state.startTime}
          setupIntervals={this._setupIntervals}
          onInputChange={this._handleInputChange}
        />
        <div className={this.state.completed ? "stats completed" : "stats"}>
          <Clock elapsed={this.state.timeElapsed} />
          <span className="wpm">{this.state.wpm}</span>
          <span className="errors">{this.state.errorCount}</span>
        </div>
      </>
    );
  };

  renderSignin = () => {
    return (
      <div classname="signin">
        <h1>Please Sign In</h1>
        <input autoFocus placeholder="Email" />
        <input />
      </div>
    );
  };

  render() {
    return (
      <>
        <div className="header">
          <h1>Type Racing</h1>
          <i onClick={this._restartGame} className="fa fa-lg fa-refresh"></i>
          <br></br>
          {this.state.completed && (
            <div>
              <h1>Game Over</h1>
              <h3>
                Congratulations! {this.state.wpm} WPM is the #
                {this.state.scoreIndex + 1} best score out of{" "}
                {this.state.totalScores + 1}.
              </h3>
              {this.state.high_scores.map(item => {
                return (
                  <ul>
                    <li>
                      User bob, for excerpt #{item.excerpt_id} types {item.wpm}{" "}
                      WPM {console.log(item)}
                    </li>
                  </ul>
                );
              })}
            </div>
          )}
          <i className="fa fa-lg fa-bars" onClick={this._changeView}></i>
          {this.state.token && this.state.token.length > 1 ? (
            <div>Sign Out</div>
          ) : (
            <div> Sign In</div>
          )}
        </div>
        {this.state.token && this.state.token.length > 1
          ? this.renderGame()
          : this.renderSignin()}
        <Footer />
      </>
    );
  }
}

export default App;
