import React from 'react'

export default React.createClass({
  startActivity: function () {
    this.props.startActivity()
  },

  strongComponent: function () {
    if (this.props.strong > 0) {
      return (
        <h2 className="title is-3">
          ⚡⚡ You've written {this.props.strong} strong sentences. ⚡⚡
        </h2>
      )
    }
  },

  render: function () {
    return (
      <section className="hero section is-fullheight minus-nav">
        <div className="hero-body">
          <div className="container has-text-centered">
            {this.strongComponent()}
            <h2 className="title is-3">
              🎯 Your Goal is to write five strong sentences. 🎯
            </h2>
            <h4 className="title is-5">
              <button className="button is-primary is-large" onClick={this.startActivity}>Continue</button>
            </h4>
          </div>
        </div>
      </section>
    )
  }
})
