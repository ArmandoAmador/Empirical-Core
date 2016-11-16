import React from 'react'

export default React.createClass({
  getInitialState: function () {
    return {
      showIntro: false,
      name: ''
    }
  },

  handleNameChange: function (e) {
    this.setState({name: e.target.value});
  },

  getLessonName: function () {
    return this.props.lesson.name
  },

  startActivity: function () {
    if (this.props.lesson.landingPageHtml) {
      this.setState({showIntro: true})
    } else {
      this.props.startActivity(this.state.name)
    }
  },

  leaveIntro: function () {
    this.props.startActivity(this.state.name)
  },

  resume: function () {
    this.props.resumeActivity(this.props.session)
  },

  renderResume: function () {
    if (this.props.session) {
      return (
        <button className="button student-begin is-fullwidth" onClick={this.resume}>Resume</button>
      )
    }
  },

  renderIntro: function () {
    if (this.state.showIntro) {
      return (
        <div className="container">
          <div className="landing-page-html" dangerouslySetInnerHTML={{__html: this.props.lesson.landingPageHtml}}></div>
          <button className="button student-begin is-fullwidth" onClick={this.leaveIntro}>Start Lesson</button>
        </div>
      )
    } else {
      return (
        <div className="container">
          <h2 className="title is-3 register">
            Welcome to Quill Connect!
          </h2>
          <img style={{maxHeight: '50vh', margin: '0 auto 20px', display: 'block'}} src={"http://i1.wp.com/www.connect.quill.org/wp-content/uploads/2016/04/animation.gif?fit=1100%2C265"}/>
          <div className="register-container">
            <ul className="register-list">
              <li>Combine the sentences together into one sentence.</li>
              <li>You may add or remove words.</li>
              <li>There is often more than one correct answer.</li>
              <li>Remember to use correct spelling, capitalization, and punctuation!</li>
            </ul>
            <button className="button student-begin is-fullwidth" onClick={this.startActivity}>Start</button>{this.renderResume()}
            <br/>
          </div>
        </div>
      )
    }
  },

  render: function () {
    return (
      <section className="student" style={{
        paddingTop: 20
      }}>
        {this.renderIntro()}
      </section>
    )
  }
})
