import {html, css} from 'lit'

import '@material/mwc-fab'
import '@material/mwc-icon'

import {GrampsjsView} from './GrampsjsView.js'
import {apiGet, apiPut} from '../api.js'
import {fireEvent, objectTypeToEndpoint} from '../util.js'

const editTitle = {
  person: 'Edit Person',
  family: 'Edit Family',
  event: 'Edit Event',
  place: 'Edit Place',
  citation: 'Edit Citation',
  source: 'Edit Source',
  repository: 'Edit Repository',
  media: 'Edit Media Object',
  note: 'Edit Note'
}

export class GrampsjsViewObject extends GrampsjsView {
  static get styles () {
    return [
      super.styles,
      css`
      :host {
      }

      mwc-fab {
        position: fixed;
        bottom: 32px;
        right: 32px;
      }
    `]
  }

  static get properties () {
    return {
      grampsId: {type: String},
      canEdit: {type: Boolean},
      edit: {type: Boolean},
      _data: {type: Object},
      _className: {type: String}
    }
  }

  constructor () {
    super()
    this.canEdit = false
    this.edit = false
    this._data = {}
    this._className = ''
  }

  getUrl () {
    return ''
  }

  renderContent () {
    if (Object.keys(this._data).length === 0) {
      if (this.loading) {
        return html``
      }
      return html``
    }
    return html`
    ${this.renderElement()}
    ${this.canEdit && !this.edit ? this.renderFab() : ''}
    `
  }

  renderFab () {
    return html`
    <mwc-fab icon="edit" @click="${this._handleFab}"></mwc-fab>
    `
  }

  _handleFab () {
    this.edit = true
    fireEvent(this, 'edit-mode:on', {title: this._(editTitle[this._className] || 'Edit')})
  }

  _disableEditMode () {
    this.edit = false
  }

  renderElement () {
    return html``
  }

  connectedCallback () {
    super.connectedCallback()
    window.addEventListener('edit-mode:off', this._disableEditMode.bind(this))
    this.addEventListener('edit:action', this.handleEditAction.bind(this))
  }

  disconnectedCallback () {
    this.removeEventListener('edit:action', this.handleEditAction.bind(this))
    window.removeEventListener('edit-mode:off', this._disableEditMode.bind(this))
    super.disconnectedCallback()
  }

  update (changed) {
    super.update(changed)
    if (this.active && changed.has('grampsId')) {
      this._updateData()
    }
  }

  _updateData (clearData = true) {
    if (this._url === '') {
      return
    }
    if (this.grampsId !== undefined && this.grampsId) {
      if (clearData) {
        this._data = {}
      }
      this.loading = true
      apiGet(this.getUrl()).then(data => {
        this.loading = false
        if ('data' in data) {
          [this._data] = data.data
          this.error = false
          if (this._className !== '') {
            this.dispatchEvent(new CustomEvent('object:loaded', {bubbles: true, composed: true, detail: {grampsId: this.grampsId, className: this._className}}))
          }
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
    }
  }

  handleEditAction (e) {
    if (e.detail.action === 'delEvent') {
      this.delEvent(e.detail.handle, this._data, this._className)
    } else if (e.detail.action === 'delCitation') {
      this.delHandle(e.detail.handle, this._data, this._className, 'citation_list')
    } else if (e.detail.action === 'upEvent') {
      this.moveEvent(e.detail.handle, this._data, this._className, 'up')
    } else if (e.detail.action === 'downEvent') {
      this.moveEvent(e.detail.handle, this._data, this._className, 'down')
    } else if (e.detail.action === 'upCitation') {
      this.moveHandle(e.detail.handle, this._data, this._className, 'citation_list', 'up')
    } else if (e.detail.action === 'downCitation') {
      this.moveHandle(e.detail.handle, this._data, this._className, 'citation_list', 'down')
    } else {
      alert(JSON.stringify(e.detail))
    }
  }

  delEvent (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj.event_ref_list = _obj.event_ref_list.filter(eventRef => eventRef.ref !== handle)
      return _obj
    })
  }

  delHandle (handle, obj, objType, prop) {
    return this._updateObject(obj, objType, (_obj) => {
      _obj[prop] = _obj[prop].filter(_handle => _handle !== handle)
      return _obj
    })
  }

  moveEvent (handle, obj, objType, upDown) {
    return this._updateObject(obj, objType, (_obj) => {
      const i = (_obj.event_ref_list.map(eref => eref.ref) || []).indexOf(handle)
      if (upDown === 'up') {
        _obj.event_ref_list = moveUp(_obj.event_ref_list, i)
      } else if (upDown === 'down') {
        _obj.event_ref_list = moveDown(_obj.event_ref_list, i)
      }
      return _obj
    })
  }

  moveHandle (handle, obj, objType, prop, upDown) {
    return this._updateObject(obj, objType, (_obj) => {
      const i = (_obj[prop] || []).indexOf(handle)
      alert(i)
      if (upDown === 'up') {
        _obj[prop] = moveUp(_obj[prop], i)
      } else if (upDown === 'down') {
        _obj[prop] = moveDown(_obj[prop], i)
      }
      return _obj
    })
  }

  _updateObject (obj, objType, updateFunc) {
    let {extended, profile, backlinks, ...objNew} = obj
    objNew = {_class: capitalize(objType), ...objNew}
    const url = `/api/${objectTypeToEndpoint[objType]}/${obj.handle}`
    apiPut(url, updateFunc(objNew)).then(() => this._updateData(false))
  }
}

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// move up the element with index i in the array
function moveUp (array, i) {
  if (i <= 0) {
    return array
  }
  return [
    ...array.slice(0, i - 1),
    array[i],
    array[i - 1],
    ...array.slice(i + 1)
  ]
}

// move down the element with index i in the array
function moveDown (array, i) {
  if (i >= array.length - 1) {
    return array
  }
  return [
    ...array.slice(0, i),
    array[i + 1],
    array[i],
    ...array.slice(i + 2)
  ]
}