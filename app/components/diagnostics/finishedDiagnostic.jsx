import React from 'react'
import Spinner from '../shared/spinner.jsx'
export default React.createClass({

  componentDidMount: function () {
    this.props.saveToLMS()
  },

  renderSavedIndicator: function () {
    if (this.props.saved) {
      return (
        <div>
          Saved Diagnostic
        </div>
      )
    } else {
      return (
        <div>
          Saving Diagnostic
        </div>
      )
    }
  },

  render: function () {
    return (
      <div className="landing-page">
        <h1>You've completed the Quill Placement Activity </h1>
        <p>
          Your results are being saved now.
          You'll be redirected automatically once they are saved.
        </p>
        <Spinner/>
      </div>
    )
  },

})
